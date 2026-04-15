import "./styles.css";
import "../styles/chat.css";
import { html, render, nothing } from "lit-html";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { normalizeMessage, normalizeRoleForGrouping } from "../ui/chat/message-normalizer.ts";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../ui/chat/grouped-render.ts";
import { CHAT_ATTACHMENT_ACCEPT, isSupportedChatAttachmentMimeType } from "../ui/chat/attachment-support.ts";
import { icons } from "../ui/icons.ts";
import { isSttSupported, startStt, stopStt } from "../ui/chat/speech.ts";
import { normalizeLowercaseStringOrEmpty } from "../ui/string-coerce.ts";
import type { ChatItem, MessageGroup } from "../ui/types/chat-types.ts";
import type { ChatAttachment } from "../ui/ui-types.ts";
import { loadControlUiBootstrapConfig } from "../ui/controllers/control-ui-bootstrap.ts";
import { applySettingsFromUrl } from "../ui/app-settings.ts";
import {
  GatewayBrowserClient,
  type GatewayEventFrame,
  type GatewayHelloOk,
} from "../ui/gateway.ts";
import { loadSettings } from "../ui/storage.ts";
import type { GatewaySessionRow, SessionsListResult } from "../ui/types.ts";

type Mood = "idle" | "listening" | "thinking" | "routing" | "executing" | "blocked" | "done";
type Role = "assistant" | "system" | "user" | "tool";

type ChatMessage = {
  role: Role;
  text: string;
  collapsed?: boolean;
};

type ContextItem = {
  id: string;
  name: string;
  status: string;
  pipeline: string;
  taskStatus: string;
  unread: boolean;
  mood: Mood;
  project: string;
  ambient: string;
  quickActions: string[]; // kept for compatibility but not rendered
  draft: string;
  messages: ChatMessage[];
  updatedAt: number;
};

type SessionState = {
  row: GatewaySessionRow;
  messages: ChatMessage[];
  draft: string;
  attachments: ChatAttachment[];
  unread: boolean;
  toolStatus: string | null;
  // UI rename state
  nameEditing?: boolean;
  nameDraft?: string;
  nameLoading?: boolean;
};

const liveSessions = new Map<string, SessionState>();
const settings = loadSettings();
const settingsHost = {
  settings,
  sessionKey: settings.sessionKey,
  pendingGatewayUrl: null as string | null,
  pendingGatewayToken: null as string | null,
  applySettings(next: typeof settings) {
    Object.assign(settings, next);
  },
};
applySettingsFromUrl(settingsHost as never);
if (settingsHost.pendingGatewayUrl) {
  settings.gatewayUrl = settingsHost.pendingGatewayUrl;
}
if (settingsHost.pendingGatewayToken) {
  settings.token = settingsHost.pendingGatewayToken;
}
if (settingsHost.sessionKey) {
  settings.sessionKey = settingsHost.sessionKey;
  settings.lastActiveSessionKey = settingsHost.sessionKey;
}

function deriveGatewayCandidates(primary: string): string[] {
  const values = new Set<string>();
  const trimmed = primary.trim();
  if (trimmed) {
    values.add(trimmed);
  }
  try {
    const current = new URL(window.location.href);
    const wsProto = current.protocol === "https:" ? "wss:" : "ws:";
    values.add(`${wsProto}//127.0.0.1:19004/ws`);
    values.add(`${wsProto}//127.0.0.1:19004/`);
    values.add(`${wsProto}//localhost:19004/ws`);
    values.add(`${wsProto}//localhost:19004/`);
    values.add(`${wsProto}//${current.host}/ws`);
    values.add(`${wsProto}//${current.host}/`);
  } catch {
    // ignore
  }
  return Array.from(values);
}

const state = {
  assistantName: "Lain",
  assistantAvatar: null as string | null,
  status: "Connecting to gateway",
  sttRecording: false,
  sttInterimText: "",
  pipeline: "Boot · Live gateway attach",
  currentContextId: settings.lastActiveSessionKey || settings.sessionKey || "main",
  connected: false,
  gatewayUrl: settings.gatewayUrl,
  gatewayCandidates: deriveGatewayCandidates(settings.gatewayUrl),
  gatewayCandidateIndex: 0,
  error: null as string | null,
  client: null as GatewayBrowserClient | null,
  hello: null as GatewayHelloOk | null,
  sessionsLoading: false,
  chatLoading: false,
  sending: false,
  // title generation modal state
  titleModalOpen: false,
  titleModalLoading: false,
  titleModalSeed: null as string | null,
  generatedTitles: [] as string[],
  titleModalSelected: 0,
};

function extractToolStatus(message: unknown): string | null {
  const normalized = normalizeMessage(message);
  const firstToolBit = normalized.content.find((item) => item.type === "tool_use" || item.type === "tool_result");
  if (!firstToolBit) {
    return null;
  }
  if (firstToolBit.type === "tool_use") {
    return firstToolBit.name ? `Applying ${firstToolBit.name}` : "Applying tool";
  }
  return firstToolBit.name ? `${firstToolBit.name} returned` : "Tool returned";
}

function normalizedMessageToChatMessage(message: unknown): ChatMessage | null {
  const normalized = normalizeMessage(message);
  const role = normalizeRoleForGrouping(normalized.role);
  const text = normalized.content
    .map((item) => {
      if (item.type === "text") {
        return item.text ?? "";
      }
      if (item.type === "tool_use") {
        const args = item.args ? JSON.stringify(item.args, null, 2) : "";
        return `Tool call · ${item.name ?? "unknown"}${args ? `\n${args}` : ""}`;
      }
      if (item.type === "tool_result") {
        return item.text ?? `Tool result · ${item.name ?? "unknown"}`;
      }
      if (item.name) {
        const args = item.args ? JSON.stringify(item.args, null, 2) : "";
        return `${item.name}${args ? `\n${args}` : ""}`;
      }
      return item.text ?? "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!text) {
    return null;
  }

  if (role === "tool") {
    return null;
  }

  if (role === "assistant" || role === "system" || role === "user") {
    return { role, text };
  }

  return { role: "system", text };
}

function summarizePipeline(row: GatewaySessionRow): string {
  if (row.status === "running") {
    return "Active · Running";
  }
  if (row.model) {
    return `Live · ${row.model}`;
  }
  return "Live · Attached";
}

function inferMood(row: GatewaySessionRow, messages: ChatMessage[]): Mood {
  if (row.abortedLastRun) {
    return "blocked";
  }
  if (row.status === "running") {
    return "executing";
  }
  if (messages.length === 0) {
    return "idle";
  }
  const last = messages[messages.length - 1]?.text?.toLowerCase() ?? "";
  if (/(error|failed|blocked|unauthorized)/.test(last)) {
    return "blocked";
  }
  if (/(done|fixed|complete|success)/.test(last)) {
    return "done";
  }
  if (/(review|investigate|analyze|compare)/.test(last)) {
    return "thinking";
  }
  if (/(implement|build|patch|wire|connect)/.test(last)) {
    return "executing";
  }
  return "routing";
}

function buildAmbient(row: GatewaySessionRow): string {
  const parts = [row.kind, row.surface, row.subject, row.room].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  return parts.length ? parts.join(" · ") : "Live session attached to the wire.";
}

function getCurrentSession(): SessionState | null {
  return liveSessions.get(state.currentContextId) ?? liveSessions.values().next().value ?? null;
}

function ensureSession(row: GatewaySessionRow): SessionState {
  const existing = liveSessions.get(row.key);
  if (existing) {
    existing.row = row;
    return existing;
  }
  const created: SessionState = {
    row,
    messages: [],
    draft: "",
    attachments: [],
    unread: false,
    toolStatus: null,
    nameEditing: false,
    nameDraft: row.label ?? row.subject ?? "",
    nameLoading: false,
  };
  liveSessions.set(row.key, created);
  return created;
}

function buildContexts(): ContextItem[] {
  return Array.from(liveSessions.values())
    .toSorted((a, b) => (b.row.updatedAt ?? 0) - (a.row.updatedAt ?? 0))
    .map((session) => {
      const row = session.row;
      const name = row.label || row.displayName || row.subject || row.key;
      return {
        id: row.key,
        name,
        status:
          row.status === "running"
            ? "Run in flight"
            : row.updatedAt
              ? `Updated ${new Date(row.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Attached",
        pipeline: summarizePipeline(row),
        unread: session.unread,
        mood: inferMood(row, session.messages),
        project: row.subject || row.label || row.key,
        ambient: buildAmbient(row),
        quickActions: [],
      taskStatus: row.status ?? "no-active-run",
        draft: session.draft,
        messages: session.messages,
        updatedAt: row.updatedAt ?? 0,
      };
    });
}

async function loadSessionsList() {
  if (!state.client || !state.connected) {
    return;
  }
  state.sessionsLoading = true;
  state.error = null;
  rerender();
  try {
    const res = await state.client.request<SessionsListResult>("sessions.list", {
      includeGlobal: true,
      includeUnknown: true,
      limit: 50,
    });
    const seen = new Set<string>();
    for (const row of res.sessions ?? []) {
      ensureSession(row);
      seen.add(row.key);
    }
    for (const key of Array.from(liveSessions.keys())) {
      if (!seen.has(key)) {
        liveSessions.delete(key);
      }
    }
    if (!liveSessions.has(state.currentContextId)) {
      state.currentContextId = res.sessions?.[0]?.key ?? "main";
    }
    state.pipeline = `Live · ${res.count} sessions attached`;
    state.status = state.connected ? "Tracking active contexts" : state.status;
  } catch (error) {
    state.error = String(error);
    state.status = "Failed to load sessions";
  } finally {
    state.sessionsLoading = false;
    rerender();
  }
}

async function loadChatHistory(sessionKey: string) {
  if (!state.client || !state.connected) {
    return;
  }
  const session = liveSessions.get(sessionKey);
  if (!session) {
    return;
  }
  state.chatLoading = true;
  rerender();
  try {
    const res = await state.client.request<{ messages?: Array<unknown> }>("chat.history", {
      sessionKey,
      limit: 120,
    });
    session.messages = (res.messages ?? [])
      .map(normalizedMessageToChatMessage)
      .filter((message): message is ChatMessage => Boolean(message));
    session.toolStatus = null;
  } catch (error) {
    session.messages = [
      {
        role: "system",
        text: `History load failed: ${String(error)}`,
      },
    ];
  } finally {
    state.chatLoading = false;
    rerender();
  }
}

async function setCurrentContext(contextId: string) {
  state.currentContextId = contextId;
  const session = liveSessions.get(contextId);
  if (session) {
    session.unread = false;
  }
  rerender();
  await loadChatHistory(contextId);
  // after history loads and DOM updates, scroll to bottom to show latest message
  requestAnimationFrame(() => scrollChatToBottom(true));
}

function updateDraft(value: string) {
  const session = getCurrentSession();
  if (!session) {
    return;
  }
  session.draft = value;
}

async function submitComposer(prefill?: string) {
  const session = getCurrentSession();
  if (!session || !state.client || !state.connected || state.sending) {
    return;
  }
  const text = (prefill ?? session.draft).trim();
  if (!text) {
    return;
  }
  session.messages = [...session.messages, { role: "user", text }];
  session.draft = "";
  state.sending = true;
  state.error = null;
  rerender();
  try {
    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: false,
      idempotencyKey: crypto.randomUUID(),
      attachments: session.attachments.map((att) => ({
        type: "image",
        mimeType: att.mimeType,
        content: att.dataUrl.replace(/^data:[^;]+;base64,/, ""),
      })),
    });
     session.attachments = [];
  } catch (error) {
    state.error = String(error);
    session.messages = [
      ...session.messages,
      { role: "system", text: `Send failed: ${String(error)}` },
    ];
  } finally {
    state.sending = false;
    rerender();
  }
}

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
}

function isUserNearBottom(threshold = 200) {
  try {
    const root = document.querySelector<HTMLElement>('.chat-thread');
    if (!root) {return true;} // if we can't find it, be permissive and allow autoscroll
    // find the nearest scrollable ancestor containing the last message
    const last = document.querySelector<HTMLElement>('.chat-thread-inner > *:last-child') || document.querySelector<HTMLElement>('.chat-thread > *:last-child');
    const container = (last && last.closest && last.closest('.chat-thread')) || root;
    // prefer container that actually scrolls
    const scrollable = (container && ((container.scrollHeight || 0) > (container.clientHeight || 0))) ? container : root;
    const distanceFromBottom = (scrollable.scrollHeight || 0) - ((scrollable.scrollTop || 0) + (scrollable.clientHeight || 0));
    return distanceFromBottom <= threshold;
  } catch (e) {
    return true;
  }
}

function scrollChatToBottom(smooth = false) {
  // Smart scroll: try scrollIntoView on the last message first (works across layouts)
  requestAnimationFrame(() => {
    try {
      const last = document.querySelector<HTMLElement>('.chat-thread-inner > *:last-child') || document.querySelector<HTMLElement>('.chat-thread > *:last-child');
      if (last && typeof last.scrollIntoView === 'function') {
        last.scrollIntoView({ block: 'end', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
        window.setTimeout(() => {
          try { last.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' }); } catch (e) {}
        }, 120);
        return;
      }
    } catch (e) {
      // fall through
    }

    // fallback: same as before
    const root = document.querySelector<HTMLElement>('.chat-thread');
    if (!root) {return;}
    const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
    for (let i = all.length - 1; i >= 0; i--) {
      const el = all[i];
      try {
        const style = window.getComputedStyle(el);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          try {
            if (typeof (el as any).scrollTo === 'function') {
              (el as any).scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
            } else {
              el.scrollTop = el.scrollHeight;
            }
          } catch (e) {}
          return;
        }
      } catch (e) {}
    }

    try {
      if (typeof (root as any).scrollTo === 'function') {
        (root as any).scrollTo({ top: root.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      } else {
        root.scrollTop = root.scrollHeight;
      }
    } catch (e) {}
  });
}

function updateAttachments(next: ChatAttachment[]) {
  const session = getCurrentSession();
  if (!session) {
    return;
  }
  session.attachments = next;
  rerender();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  const next: ChatAttachment[] = [];
  for (const file of files) {
    if (!isSupportedChatAttachmentMimeType(file.type)) {
      continue;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(file);
    });
    next.push({
      id: crypto.randomUUID(),
      dataUrl,
      mimeType: file.type || "image/png",
    });
  }
  updateAttachments([...(getCurrentSession()?.attachments ?? []), ...next]);
  input.value = "";
}

function onComposerKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (!state.connected) {
      return;
    }
    event.preventDefault();
    void submitComposer();
  }
}

function handleGatewayEvent(evt: GatewayEventFrame) {
  if (evt.event === "sessions.changed") {
    void loadSessionsList();
    return;
  }
  if (evt.event !== "chat") {
    return;
  }
  const payload = evt.payload as Record<string, unknown> | undefined;
  const sessionKey = typeof payload?.sessionKey === "string" ? payload.sessionKey : null;
  const runState = payload?.state;
  if (!sessionKey) {
    return;
  }
  const session = liveSessions.get(sessionKey);
  if (!session) {
    void loadSessionsList();
    return;
  }

  if (runState === "delta") {
    const toolStatus = extractToolStatus(payload?.message);
    if (toolStatus) {
      session.toolStatus = toolStatus;
      rerender();
      return;
    }
    const nextMessage = normalizedMessageToChatMessage(payload?.message);
    if (!nextMessage) {
      return;
    }
    session.toolStatus = null;
    const last = session.messages[session.messages.length - 1];
    let appended = false;
    if (last?.role === nextMessage.role && nextMessage.role === "assistant") {
      last.text = nextMessage.text;
    } else {
      session.messages = [...session.messages, nextMessage];
      appended = true;
    }
    rerender();
    // Auto-scroll if the updated session is the current one
    if (session.row.key === state.currentContextId) {
      requestAnimationFrame(() => scrollChatToBottom(true));
    }
    if (appended) {return;}
  }

  if (runState === "final" || runState === "aborted") {
    session.toolStatus = null;
    const nextMessage = normalizedMessageToChatMessage(payload?.message);
    let appended = false;
    if (nextMessage) {
      const last = session.messages[session.messages.length - 1];
      if (last?.role === nextMessage.role && nextMessage.role === "assistant") {
        last.text = nextMessage.text;
      } else {
        session.messages = [...session.messages, nextMessage];
        appended = true;
      }
    }
    if (sessionKey !== state.currentContextId) {
      session.unread = true;
    }
    void loadSessionsList();
    rerender();
    if (session.row.key === state.currentContextId && appended) {
      requestAnimationFrame(() => scrollChatToBottom(true));
    }
  }

  if (runState === "error") {
    session.toolStatus = null;
    const errorMessage =
      typeof payload?.errorMessage === "string" ? payload.errorMessage : "chat error";
    session.messages = [...session.messages, { role: "system", text: errorMessage }];
    rerender();
    if (session.row.key === state.currentContextId) {
      requestAnimationFrame(() => scrollChatToBottom(true));
    }
  }

}

function connect(attemptIndex = 0) {
  state.client?.stop();
  const url = state.gatewayCandidates[attemptIndex] ?? state.gatewayCandidates[0] ?? settings.gatewayUrl;
  state.gatewayCandidateIndex = attemptIndex;
  state.gatewayUrl = url;
  state.status = `Connecting to gateway (${attemptIndex + 1}/${state.gatewayCandidates.length})`;
  rerender();
  const client = new GatewayBrowserClient({
    url,
    token: settings.token || undefined,
    clientName: "openclaw-control-ui",
    clientVersion: "lain-prototype",
    mode: "webchat",
    onHello: (hello) => {
      state.connected = true;
      state.hello = hello;
      state.status = "Connected to gateway";
      state.error = null;
      rerender();
      void loadSessionsList().then(() => {
        if (state.currentContextId) {
          void loadChatHistory(state.currentContextId);
        }
      });
    },
    onClose: ({ code, reason, error }) => {
      state.connected = false;
      const failure = error?.message ?? (reason || "gateway disconnected");
      const canRetry = code !== 1000 && attemptIndex + 1 < state.gatewayCandidates.length;
      if (canRetry) {
        state.status = `Gateway retry on ${state.gatewayCandidates[attemptIndex + 1]}`;
        state.error = failure;
        rerender();
        window.setTimeout(() => connect(attemptIndex + 1), 150);
        return;
      }
      state.status = `Disconnected (${code})`;
      state.error = failure;
      rerender();
    },
    onEvent: handleGatewayEvent,
  });
  state.client = client;
  client.start();
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, unknown>;
  const toolCallId = typeof m.toolCallId === "string" ? m.toolCallId : "";
  if (toolCallId) {
    return `tool:${toolCallId}`;
  }
  const id = typeof m.id === "string" ? m.id : "";
  if (id) {
    return `msg:${id}`;
  }
  const messageId = typeof m.messageId === "string" ? m.messageId : "";
  if (messageId) {
    return `msg:${messageId}`;
  }
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : null;
  const role = typeof m.role === "string" ? m.role : "unknown";
  if (timestamp != null) {
    return `msg:${role}:${timestamp}:${index}`;
  }
  return `msg:${role}:${index}`;
}

function groupMessages(items: ChatItem[]): Array<ChatItem | MessageGroup> {
  const result: Array<ChatItem | MessageGroup> = [];
  let currentGroup: MessageGroup | null = null;

  for (const item of items) {
    if (item.kind !== "message") {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(item);
      continue;
    }

    const normalized = normalizeMessage(item.message);
    const role = normalizeRoleForGrouping(normalized.role);
    const senderLabel =
      normalizeLowercaseStringOrEmpty(role) === "user" ? (normalized.senderLabel ?? null) : null;
    const timestamp = normalized.timestamp || Date.now();

    if (
      !currentGroup ||
      currentGroup.role !== role ||
      (normalizeLowercaseStringOrEmpty(role) === "user" && currentGroup.senderLabel !== senderLabel)
    ) {
      if (currentGroup) {
        result.push(currentGroup);
      }
      currentGroup = {
        kind: "group",
        key: `group:${role}:${item.key}`,
        role,
        senderLabel,
        messages: [{ message: item.message, key: item.key }],
        timestamp,
        isStreaming: false,
      };
    } else {
      currentGroup.messages.push({ message: item.message, key: item.key });
    }
  }

  if (currentGroup) {
    result.push(currentGroup);
  }
  return result;
}

function buildLainChatItems(messages: ChatMessage[]): Array<ChatItem | MessageGroup> {
  const items: ChatItem[] = messages.map((msg, index) => ({
    kind: "message",
    key: messageKey(msg, index),
    message: {
      role: msg.role,
      content: [{ type: "text", text: msg.text }],
      text: msg.text,
      timestamp: Date.now() + index,
    },
  }));
  return groupMessages(items);
}

function renderLainChatItem(item: ChatItem | MessageGroup) {
  if (item.kind === "reading-indicator") {
    return renderReadingIndicatorGroup(undefined, "");
  }
  if (item.kind === "stream") {
    return renderStreamingGroup(item.text, item.startedAt, undefined, undefined, "");
  }
  if (item.kind === "group") {
    return renderMessageGroup(item, {
      showReasoning: false,
      showToolCalls: true,
      assistantName: state.assistantName,
      assistantAvatar: state.assistantAvatar,
      basePath: "",
      contextWindow: null,
    });
  }
  return nothing;
}

function app() {
  const contexts = buildContexts();
  const current =
    contexts.find((context) => context.id === state.currentContextId) ??
    contexts[0] ??
    ({
      id: "main",
      name: state.assistantName,
      status: state.status,
      pipeline: state.pipeline,
      unread: false,
      mood: "idle",
      project: "none",
      ambient: "",
      quickActions: [],
      draft: "",
      attachments: [],
      messages: [],
      updatedAt: Date.now(),
    } as any);

  return html`
    <div class="lain-shell mood-${current?.mood ?? "idle"}">
      <header class="lain-topbar">
        <div class="lain-topbar__left">
          <div class="lain-dot"></div>
          <div class="lain-titleblock">
            <div class="lain-title">${state.assistantName}</div>
            <div class="lain-subtitle">${state.error ?? state.status}</div>
          </div>
        </div>
        <div class="lain-topbar__meta">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="pill">${current?.pipeline ?? state.pipeline}</span>
            <div class="lain-session-name" title="Click to rename" style="display:flex;align-items:center;gap:8px;">
              ${current?.nameEditing
                ? html`<input
                    class="lain-session-name-input"
                    .value=${current.nameDraft ?? current.name ?? ""}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      const s = getCurrentSession();
                      if (s) {s.nameDraft = v;}
                    }}
                    @keydown=${async (e: KeyboardEvent) => {
                      const s = getCurrentSession();
                      if (!s) {return;}
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // optimistic update
                        s.nameLoading = true;
                        const prevLabel = s.row.label;
                        s.row.label = s.nameDraft ?? s.row.label;
                        rerender();
                        try {
                          await state.client?.request('sessions.patch', { key: s.row.key, label: s.nameDraft });
                          await loadSessionsList();
                        } catch (err) {
                          // revert on error
                          s.row.label = prevLabel;
                          state.error = String(err);
                        } finally {
                          s.nameLoading = false;
                          s.nameEditing = false;
                          rerender();
                        }
                      }
                      if (e.key === 'Escape') {
                        s.nameEditing = false;
                        s.nameDraft = s.row.label ?? s.row.subject ?? '';
                        rerender();
                      }
                    }}
                  />
                  <button class="lain-chip ${current.nameLoading ? 'lain-chip--loading' : ''}" @click=${async () => {
                    const s = getCurrentSession();
                    if (!s) {return;}
                    s.nameLoading = true;
                    // optimistic update
                    const prevLabel = s.row.label;
                    s.row.label = s.nameDraft ?? s.row.label;
                    rerender();
                    try {
                      await state.client?.request('sessions.patch', { key: s.row.key, label: s.nameDraft });
                      await loadSessionsList();
                    } catch (e) {
                      s.row.label = prevLabel;
                      state.error = String(e);
                    } finally {
                      s.nameLoading = false;
                      s.nameEditing = false;
                      rerender();
                    }
                  }}>${current.nameLoading ? 'Saving...' : 'Save'}</button>
                  <button class="lain-chip" @click=${() => {
                    const s = getCurrentSession();
                    if (!s) {return;}
                    s.nameEditing = false;
                    s.nameDraft = s.row.label ?? s.row.subject ?? '';
                    rerender();
                  }}>Cancel</button>`
                : html`<strong>${current?.name ?? "(untitled)"}</strong>
                    <button class="lain-chip" @click=${() => {
                      const s = getCurrentSession();
                      if (!s) {return;}
                      s.nameEditing = true;
                      s.nameDraft = s.row.label ?? s.row.subject ?? '';
                      rerender();
                    }}>✎</button>
                    <button class="lain-chip" @click=${() => void promptGenerateAndRename()}>⚡</button>`}
            </div>
          </div>
          <button class="lain-chip" @click=${() => void createNewSession()}>Новая задача</button>
        </div>
      </header>

      <main class="lain-main">
        <aside class="lain-contexts">
          <div class="lain-section-label">contexts</div>
          <div class="lain-context-list">
            ${contexts.length === 0
              ? html`<div class="lain-empty">No live sessions yet.</div>`
              : repeat(
                  contexts,
                  (context) => context.id,
                  (context) => html`
                    <button
                      class="lain-context ${context.id === state.currentContextId ? "is-active" : ""}"
                      @click=${() => void setCurrentContext(context.id)}
                    >
                      <div class="lain-context__row">
                        <div class="lain-context__name">${context.name}</div>
                        ${context.unread ? html`<span class="lain-context__ping"></span>` : ""}
                      </div>
                      <div class="lain-context__status">${context.status}</div>
                      <div class="lain-context__pipeline">${context.pipeline}</div>
                      <div class="lain-context__taskstatus">${context.taskStatus}</div>
                    </button>
                  `,
                )}
          </div>
        </aside>

        <section class="lain-stream">
          <div class="lain-stream__meta">
            <div>
              <div class="lain-project">Current project: ${current?.project ?? "none"}</div>
              <div class="lain-context-label">Gateway: ${state.gatewayUrl}</div>
            </div>
            <div class="lain-quick-actions">
              <div class="lain-task-status">Task: ${current?.taskStatus ?? "no-active-run"}</div>
            </div>
            ${state.titleModalOpen ? html`
              <div class="lain-title-modal" tabindex="-1">
                <div class="lain-title-modal__panel">
                  <div class="lain-title-modal__header">Предложенные названия</div>
                  ${state.titleModalLoading
                    ? html`<div class="lain-title-modal__body">Генерирую варианты…</div>`
                    : html`
                        <div class="lain-title-modal__body">
                          ${state.generatedTitles.map((t, i) => html`<div class="lain-title-option ${state.titleModalSelected===i? 'is-selected':''}" @click=${() => { state.titleModalSelected = i; rerender(); }}>${t}</div>`) }
                        </div>
                        <div class="lain-title-modal__actions">
                          <button class="lain-chip" @click=${() => applyGeneratedTitle(state.generatedTitles[state.titleModalSelected] ?? state.titleModalSeed ?? 'Untitled')}>Применить</button>
                          <button class="lain-chip" @click=${() => { const s = getCurrentSession(); if (!s) {return;} s.nameEditing = true; s.nameDraft = state.generatedTitles[state.titleModalSelected] ?? state.titleModalSeed ?? ''; closeTitleModal(); }}>Редактировать</button>
                          <button class="lain-chip" @click=${() => closeTitleModal()}>Отмена</button>
                        </div>
                      `}
                </div>
              </div>` : nothing}
          </div>

          ${getCurrentSession()?.toolStatus
            ? html`<div class="lain-tool-status">${getCurrentSession()?.toolStatus}…</div>`
            : ""}

          <div class="lain-messages chat-thread">
            <div class="chat-thread-inner">
              ${repeat(
                buildLainChatItems(current?.messages ?? []),
                (item) => item.key,
                (item) => renderLainChatItem(item),
              )}
            </div>
          </div>

          <div class="agent-chat__input lain-composer-shell">
            ${(current?.attachments?.length ?? 0) > 0
              ? html`<div class="chat-attachments-preview">
                  ${current?.attachments.map(
                    (att) => html`<div class="chat-attachment-thumb">
                      <img src=${att.dataUrl} alt="attachment" />
                      <button
                        class="chat-attachment-remove"
                        @click=${() => updateAttachments((current?.attachments ?? []).filter((a) => a.id !== att.id))}
                      >
                        ${icons.x}
                      </button>
                    </div>`,
                  )}
                </div>`
              : nothing}

            <input
              type="file"
              accept=${CHAT_ATTACHMENT_ACCEPT}
              multiple
              class="agent-chat__file-input"
              @change=${(event: Event) => void handleFileSelect(event)}
            />

            ${state.sttRecording && state.sttInterimText
              ? html`<div class="agent-chat__stt-interim">${state.sttInterimText}</div>`
              : nothing}

            <textarea
              ${ref((el) => el && adjustTextareaHeight(el as HTMLTextAreaElement))}
              class="lain-composer__textarea"
              .value=${current?.draft ?? ""}
              ?disabled=${!state.connected || !current}
              @input=${(event: Event) => {
                const target = event.target as HTMLTextAreaElement;
                adjustTextareaHeight(target);
                updateDraft(target.value);
              }}
              @keydown=${onComposerKeydown}
              placeholder=${state.sttRecording ? "Listening..." : "Give Lain a task, a project path, or a question..."}
              rows="1"
            ></textarea>
            <div class="agent-chat__toolbar lain-composer__footer">
              <div class="agent-chat__toolbar-left">
                <button
                  class="agent-chat__input-btn"
                  @click=${() => {
                    document.querySelector<HTMLInputElement>(".agent-chat__file-input")?.click();
                  }}
                  ?disabled=${!state.connected}
                >
                  ${icons.paperclip}
                </button>
                ${isSttSupported()
                  ? html`<button
                      class="agent-chat__input-btn ${state.sttRecording ? "agent-chat__input-btn--recording" : ""}"
                      @click=${() => {
                        if (state.sttRecording) {
                          stopStt();
                          state.sttRecording = false;
                          state.sttInterimText = "";
                          rerender();
                        } else {
                          const started = startStt({
                            onTranscript: (text, isFinal) => {
                              if (isFinal) {
                                const currentDraft = getCurrentSession()?.draft ?? "";
                                const sep = currentDraft && !currentDraft.endsWith(" ") ? " " : "";
                                updateDraft(currentDraft + sep + text);
                                state.sttInterimText = "";
                              } else {
                                state.sttInterimText = text;
                              }
                              rerender();
                            },
                            onStart: () => {
                              state.sttRecording = true;
                              rerender();
                            },
                            onEnd: () => {
                              state.sttRecording = false;
                              state.sttInterimText = "";
                              rerender();
                            },
                            onError: () => {
                              state.sttRecording = false;
                              state.sttInterimText = "";
                              rerender();
                            },
                          });
                          if (started) {
                            state.sttRecording = true;
                            rerender();
                          }
                        }
                      }}
                    >
                      ${state.sttRecording ? icons.micOff : icons.mic}
                    </button>`
                  : nothing}
                <div class="lain-composer__hint">
                  ${state.connected ? "Enter to send, Shift+Enter for newline" : "Gateway offline"}
                </div>
              </div>
              <div class="agent-chat__toolbar-right">
                <button class="chat-send-btn" ?disabled=${!state.connected || !current || state.sending} @click=${() => void submitComposer()}>
                  ${state.sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside class="lain-persona">
          <div class="lain-portrait-wrap">
            <div class="lain-portrait-glow"></div>
            <div class="lain-portrait">${(state.assistantAvatar || state.assistantName || "L").slice(0, 1)}</div>
          </div>
          <div class="lain-state">${current?.mood ?? "idle"}</div>
          <div class="lain-ambient">${current?.ambient ?? "Trying to listen to the house through the wires."}</div>
        </aside>
      </main>
    </div>
  `;
}

function rerender() {
  render(app(), document.body);
  // After render, if any flow requested autoscroll, perform it once
  requestAnimationFrame(() => {
    if (state.autoScrollWanted) {
      scrollChatToBottom(true);
      state.autoScrollWanted = false;
    }
    // show title modal if requested
    if (state.titleModalOpen) {
      const modal = document.querySelector('.lain-title-modal') as HTMLElement | null;
      if (modal) {modal.focus();}
    }
  });
}

async function createNewSession(label?: string, initialMessage?: string) {
  if (!state.client || !state.connected) {
    state.error = "Not connected to gateway";
    rerender();
    return;
  }
  state.error = null;
  state.status = "Creating new session...";
  rerender();
  try {
    const payload: Record<string, unknown> = {};
    if (label) {payload.label = label;}
    if (initialMessage) {payload.initialMessage = initialMessage;}
    const res = await state.client.request("sessions.create", payload);
    const key = typeof res?.key === "string" ? res.key : typeof res?.sessionKey === "string" ? res.sessionKey : null;
    if (key) {
      await loadSessionsList();
      await setCurrentContext(key);
      state.status = "Session created";
    } else {
      state.error = "Failed to create session";
      state.status = "Failed to create session";
    }
  } catch (err) {
    state.error = String(err);
    state.status = "Failed to create session";
  } finally {
    rerender();
  }
}

async function promptRenameCurrent() {
  const current = getCurrentSession();
  if (!current) {return;}
  const newLabel = prompt("Rename session", current.row.label ?? current.row.subject ?? "");
  if (!newLabel) {return;}
  try {
    await state.client?.request("sessions.patch", { key: current.row.key, label: newLabel });
    await loadSessionsList();
    await setCurrentContext(current.row.key);
  } catch (e) {
    state.error = String(e);
    rerender();
  }
}

async function promptGenerateAndRename() {
  const current = getCurrentSession();
  if (!current) {return;}
  const lastUser = [...current.messages].toReversed().find((m) => m.role === "user");
  const seed = lastUser?.text ?? current.row.subject ?? "New task";
  openTitleModal(seed);
}

async function openTitleModal(seed: string) {
  state.titleModalOpen = true;
  state.titleModalSeed = seed;
  state.generatedTitles = [];
  state.titleModalSelected = 0;
  state.titleModalLoading = true;
  rerender();
  try {
    // Build a short summary from recent messages to base title generation on dialog context
    const session = getCurrentSession();
    const recent = session?.messages ?? [];
    const lastMsgs = recent.slice(-20); // last 20 messages
    // Exclude tool calls, tool results, and obvious JSON/ID fragments from the convo used for title generation
    function isToolOrJsonText(t?: string) {
      if (!t) {return true;}
      const s = t.trim();
      // messages produced from tool fragments often start with these markers
      if (/^Tool\s+(call|result)\b/i.test(s)) {return true;}
      if (/^(Applying|Tool returned|Tool returned)\b/i.test(s)) {return true;}
      // pure JSON/object/array blobs are useless for title generation
      if (/^[{[]/.test(s)) {return true;}
      // short hex/id-like tokens (e19a3070, 4179) — ignore
      if (/^[0-9a-fA-F]{3,12}$/.test(s) && !/[aeiouAEIOUаеёиоуыэюяАЕИОУЫЭЮЯ]/.test(s)) {return true;}
      return false;
    }
    const filteredMsgs = lastMsgs.filter((m) => !isToolOrJsonText(m.text));
    const convoLines = filteredMsgs
      .map((m) => {
        const who = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
        // truncate long messages for the summary
        const txt = m.text.length > 300 ? m.text.slice(0, 300) + '…' : m.text;
        return `${who}: ${txt}`;
      })
      .join('\n');

    const summaryPrompt = `Кратко (1–2 предложения) резюмируй следующий диалог и затем предложи 3 коротких варианта названия (3–6 слов) для этой сессии. Сначала резюме, затем варианты в отдельных строках:\n\n${convoLines}`;

    // Run title generation in an isolated agent run so we don't write into the session transcript.
    // Provide current sessionKey as context so gateway has a target and won't reject the run.
    const startRes = await state.client?.request('agent', {
      message: summaryPrompt,
      deliver: false,
      sessionKey: session?.row?.key,
      // Prefer a lightweight Copilot model for fast title-generation runs.
      // Use a Copilot model (non-Codex) as requested: 'github-copilot/gpt-4.1-nano' is the fastest
      // fallback to 'github-copilot/gpt-4.1-mini' if desired.
      model: 'github-copilot/gpt-4.1-nano',
      idempotencyKey: crypto.randomUUID(),
    });

    // If the gateway immediately returned an error (e.g. missing target), surface it and stop.
    if (startRes && typeof startRes === 'object' && (startRes as any).status === 'error') {
      state.error = (startRes as any).error ?? (startRes as any).errorMessage ?? 'Agent run failed';
      state.titleModalLoading = false;
      rerender();
      return;
    }

    // If the gateway returned an immediate ack (accepted) with a runId, wait for the final result
    // via agent.wait. This avoids treating the accepted ack as the final payload.
    let res = startRes;
    try {
      if (startRes && typeof startRes === 'object' && typeof (startRes as any).runId === 'string') {
        const runId = (startRes as any).runId as string;
        try {
          // wait up to 10s for a final result (adjust timeout if needed)
          const waited = await state.client?.request('agent.wait', { runId, timeoutMs: 10000 });
          if (waited) {
            res = waited;
          }
        } catch (e) {
          // ignore wait errors and fall back to startRes
        }
      }
    } catch (e) {}

    // Debug helper: expose raw agent response for inspection in the browser console
    try {
      // attach to window so user can inspect after the call
      (window as any).__lastAgentTitleGen = res;
      // also log to console (some environments suppress debug)
      // use console.log to increase visibility
      try { console.log('lain: agent raw response', res); } catch (e) {}
    } catch (e) {}

    let textResult: string | null = null;
    if (res && typeof res === 'object') {
      // agent responses commonly come back as payload.result
      const payload = (res as any).result ?? res;
      if (typeof payload === 'string') {textResult = payload;}
      else if (payload && typeof payload === 'object') {
        if (typeof payload.text === 'string') {textResult = payload.text;}
        else if (typeof payload.message === 'string') {textResult = payload.message;}
        else if (Array.isArray(payload.content)) {
          textResult = payload.content.map((c: any) => c?.text ?? '').filter(Boolean).join('\n');
        } else if (typeof payload.output === 'string') {textResult = payload.output;}
        else {textResult = JSON.stringify(payload);}
      }
    }

    // fallback: if no direct text in the agent response, try loading history and taking last assistant message
    if (!textResult) {
      await loadChatHistory(session!.row.key);
      const msgs = getCurrentSession()?.messages ?? [];
      const lastAssistant = [...msgs].toReversed().find((m) => m.role === 'assistant');
      textResult = lastAssistant?.text ?? null;
    }

    // Postprocess potential JSON-like agent output and try to extract readable lines
    try {
      if (textResult && (/^[\s{[]|\{"/.test(textResult))) {
        const parsed = JSON.parse(textResult);
        const collect = (v: any): string[] => {
          if (v == null) {return [];}
          if (typeof v === 'string') {return [v];}
          if (Array.isArray(v)) {return v.flatMap((e) => collect(e));}
          if (typeof v === 'object') {return Object.keys(v).flatMap((k) => collect(v[k]));}
          return [];
        };
        const flat = collect(parsed).filter(Boolean).join('\n');
        if (flat) {textResult = flat;}
      }
    } catch (e) {
      // ignore parse errors — we'll fallback to line filtering below
    }

    const variants = parseTitleVariants(textResult ?? seed);
    // heuristic to drop strings that look like internal IDs / hex / numbers
    function isLikelyId(s: string): boolean {
      if (!s) {return true;}
      const t = s.trim();
      if (t.length <= 2) {return true;}
      // pure numbers, short
      if (/^[0-9]+$/.test(t) && t.length <= 6) {return true;}
      // hex-ish tokens without vowels, e.g. e19a3070, abcd1234
      if (/^[0-9a-fA-F]+$/.test(t) && t.length >= 3 && t.length <= 12 && !/[aeiouAEIOUаеёиоуыэюяАЕИОУЫЭЮЯ]/.test(t)) {return true;}
      // short single-token alpha-numeric without vowels
      if (!/\s/.test(t) && t.length <= 4 && !/[aeiouAEIOUаеёиоуыэюяАЕИОУЫЭЮЯ]/.test(t)) {return true;}
      return false;
    }

    const uniqFiltered = Array.from(new Set(variants.map((v) => v.trim())))
      .filter((v) => !!v && !/^\s*[{[]/.test(v) && v.length < 120 && !isLikelyId(v))
      .slice(0, 3);

    state.generatedTitles = uniqFiltered.length ? uniqFiltered : [seed];
    state.titleModalSelected = 0;
  } catch (err) {
    state.error = String(err);
    state.generatedTitles = [seed];
  } finally {
    state.titleModalLoading = false;
    rerender();
  }
}

function closeTitleModal() {
  state.titleModalOpen = false;
  state.generatedTitles = [];
  state.titleModalSeed = null;
  state.titleModalSelected = 0;
  rerender();
}

function parseTitleVariants(text: string): string[] {
  if (!text) {return [];}
  // split by lines, commas, or semicolons and clean
  const lines = text.split(/\r?\n|\s*[-•]\s*|,|;/).map((l) => l.trim()).filter(Boolean);
  const cleaned = lines.map((l) => l.replace(/^\s*['"“”`]+|['"“”`]+\s*$/g, ''));
  // further split if first line contains multiple options separated by ";" or ","
  const flat = cleaned.flatMap((l) => l.split(/;|\|/).map((s) => s.trim())).filter(Boolean);
  // keep short variants (<=6 words), else break into phrase fragments
  const uniq: string[] = [];
  for (const v of flat) {
    const words = v.split(/\s+/).filter(Boolean);
    if (words.length > 8) {continue;}
    const candidate = v.replace(/^Title:\s*/i, '').trim();
    if (candidate && !uniq.includes(candidate)) {uniq.push(candidate);}
    if (uniq.length >= 5) {break;}
  }
  return uniq.slice(0, 3);
}

async function applyGeneratedTitle(title: string) {
  const s = getCurrentSession();
  if (!s) {return;}
  s.nameLoading = true;
  rerender();
  try {
    await state.client?.request('sessions.patch', { key: s.row.key, label: title });
    await loadSessionsList();
    await setCurrentContext(s.row.key);
    closeTitleModal();
  } catch (e) {
    state.error = String(e);
    rerender();
  } finally {
    s.nameLoading = false;
    rerender();
  }
}

async function init() {
  rerender();
  await loadControlUiBootstrapConfig({
    basePath: "",
    assistantName: state.assistantName,
    assistantAvatar: state.assistantAvatar,
    assistantAgentId: null,
    serverVersion: null,
  }).then(() => {
    rerender();
  });
  connect();
}

void init();
