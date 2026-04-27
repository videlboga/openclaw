import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { toSanitizedMarkdownHtml } from "../ui/markdown.ts";
import "./styles.css";
import "../styles/chat.css";
import { html, render, nothing } from "lit-html";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { applySettingsFromUrl } from "../ui/app-settings.ts";
import {
  CHAT_ATTACHMENT_ACCEPT,
  isSupportedChatAttachmentMimeType,
} from "../ui/chat/attachment-support.ts";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../ui/chat/grouped-render.ts";
import { normalizeMessage, normalizeRoleForGrouping } from "../ui/chat/message-normalizer.ts";
import { isSttSupported, startStt, stopStt } from "../ui/chat/speech.ts";
import { loadControlUiBootstrapConfig } from "../ui/controllers/control-ui-bootstrap.ts";
import { loadModels } from "../ui/controllers/models.ts";
import {
  GatewayBrowserClient,
  type GatewayEventFrame,
  type GatewayHelloOk,
} from "../ui/gateway.ts";
import { icons } from "../ui/icons.ts";
import { loadSettings } from "../ui/storage.ts";
import { normalizeLowercaseStringOrEmpty } from "../ui/string-coerce.ts";
import type { GatewaySessionRow, SessionsListResult, ModelCatalogEntry } from "../ui/types.ts";
import type { ChatItem, MessageGroup } from "../ui/types/chat-types.ts";
import type { ChatAttachment } from "../ui/ui-types.ts";

type Mood = "idle" | "listening" | "thinking" | "routing" | "executing" | "blocked" | "done";
type Role = "assistant" | "system" | "user" | "tool";

type ChatMessage = {
  id?: string;
  timestamp?: number;
  timestamp?: number;
  role: Role;
  text: string;
  content?: any[];
  collapsed?: boolean;
};

type ContextItem = {
  id: string;
  name: string;
  status: string;
  pipeline: string;
  taskStatus: string;
  unread: boolean;
  isStreaming?: boolean;
  isStreaming?: boolean;
  mood: Mood;
  project: string;
  ambient: string;
  quickActions: string[]; // kept for compatibility but not rendered
  draft: string;
  messages: ChatMessage[];
  updatedAt: number;
  nameEditing?: boolean;
  nameDraft?: string;
  nameLoading?: boolean;
  attachments?: any[];
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
  autoScrollWanted: false,
  hudCollapsed: false,
  contextsCollapsed: false,
  models: [] as ModelCatalogEntry[],
  selectedModel: null as string | null,
};

function extractToolStatus(message: unknown): string | null {
  const normalized = normalizeMessage(message);
  const firstToolBit = normalized.content.find(
    (item) => item.type === "tool_call" || item.type === "tool_result",
  );
  if (!firstToolBit) {
    return null;
  }
  if (firstToolBit.type === "tool_call") {
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
      if (item.type === "tool_call") {
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

  const hasTool = normalized.content.some(
    (i) => i.type === "tool_call" || i.type === "tool_result",
  );

  if (!text && !hasTool) {
    return null;
  }

  const content = normalized.content;

  if (role === "tool") {
    return { id: normalized.id, role: role as Role, text, content, timestamp: normalized.timestamp };
  }

  if (role === "assistant" || role === "system" || role === "user") {
    return { id: normalized.id, role: role as Role, text, content, timestamp: normalized.timestamp };
  }

  return { id: normalized.id, role: "system", text, content, timestamp: normalized.timestamp };
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
    requestAnimationFrame(() => scrollChatToBottom(false));
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
  session.messages = [...session.messages, { role: "user", text, timestamp: Date.now() }];
  session.draft = "";
  // Force clearing the DOM textarea here
  const textarea = document.querySelector(".lain-composer__textarea");
  if (textarea) {textarea.value = "";}
  state.sending = true;
  state.error = null;
  // While we wait for the gateway to respond, assume we're streaming/loading.
  session.isStreaming = true; 
  rerender();
  try {
    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: true,
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

function _isUserNearBottom(threshold = 200) {
  try {
    const root = document.querySelector<HTMLElement>(".chat-thread");
    if (!root) {
      return true;
    } // if we can't find it, be permissive and allow autoscroll
    // find the nearest scrollable ancestor containing the last message
    const last =
      document.querySelector<HTMLElement>(".chat-thread-inner > *:last-child") ||
      document.querySelector<HTMLElement>(".chat-thread > *:last-child");
    const container = (last && last.closest && last.closest(".chat-thread")) || root;
    // prefer container that actually scrolls
    const scrollable =
      container && (container.scrollHeight || 0) > (container.clientHeight || 0) ? container : root;
    const distanceFromBottom =
      (scrollable.scrollHeight || 0) -
      ((scrollable.scrollTop || 0) + (scrollable.clientHeight || 0));
    return distanceFromBottom <= threshold;
  } catch (_e) {
    return true;
  }
}

function scrollChatToBottom(smooth = false) {
  // Smart scroll: try scrollIntoView on the last message first (works across layouts)
  requestAnimationFrame(() => {
    try {
      const last =
        document.querySelector<HTMLElement>(".chat-thread-inner > *:last-child") ||
        document.querySelector<HTMLElement>(".chat-thread > *:last-child");
      if (last && typeof last.scrollIntoView === "function") {
        last.scrollIntoView({
          block: "end",
          inline: "nearest",
          behavior: smooth ? "smooth" : "auto",
        });
        window.setTimeout(() => {
          try {
            last.scrollIntoView({ block: "end", inline: "nearest", behavior: "auto" });
          } catch (_e) {}
        }, 120);
        return;
      }
    } catch (_e) {
      // fall through
    }

    // fallback: same as before
    const root = document.querySelector<HTMLElement>(".chat-thread");
    if (!root) {
      return;
    }
    const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
    for (let i = all.length - 1; i >= 0; i--) {
      const el = all[i];
      try {
        const style = window.getComputedStyle(el);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight
        ) {
          try {
            if (typeof (el as any).scrollTo === "function") {
              (el as any).scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
            } else {
              el.scrollTop = el.scrollHeight;
            }
          } catch (_e) {}
          return;
        }
      } catch (_e) {}
    }

    try {
      if (typeof (root as any).scrollTo === "function") {
        (root as any).scrollTo({ top: root.scrollHeight, behavior: smooth ? "smooth" : "auto" });
      } else {
        root.scrollTop = root.scrollHeight;
      }
    } catch (_e) {}
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
  console.log("Lain Event:", evt.event, evt.payload);
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
    session.isStreaming = true;
    session.isStreaming = true;
    const toolStatus = extractToolStatus(payload?.message);
    session.toolStatus = toolStatus || null;
    const nextMessage = normalizedMessageToChatMessage(payload?.message);
    if (!nextMessage) {
      rerender();
      return;
    }
    const last = session.messages[session.messages.length - 1];
    let appended = false;
    if (last?.role === nextMessage.role && nextMessage.role === "assistant") {
      last.text = nextMessage.text;
      last.content = nextMessage.content;
      last.content = nextMessage.content;
    } else {
      session.messages = [...session.messages, nextMessage];
      appended = true;
    }
    rerender();
    // Auto-scroll if the updated session is the current one
    if (session.row.key === state.currentContextId) {
      requestAnimationFrame(() => scrollChatToBottom(true));
    }
    if (appended) {
      return;
    }
  }

  if (runState === "final" || runState === "aborted") {
    session.isStreaming = false;
    session.isStreaming = false;
    session.toolStatus = null;
    const nextMessage = normalizedMessageToChatMessage(payload?.message);
    let appended = false;
    if (nextMessage) {
      const last = session.messages[session.messages.length - 1];
      if (last?.role === nextMessage.role && nextMessage.role === "assistant") {
        last.text = nextMessage.text;
        last.content = nextMessage.content;
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
    session.isStreaming = false;
    session.isStreaming = false;
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
  const url =
    state.gatewayCandidates[attemptIndex] ?? state.gatewayCandidates[0] ?? settings.gatewayUrl;
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

      void loadModels(client).then((models) => {
        state.models = models;
        if (!state.selectedModel && models.length > 0) {
          state.selectedModel = models[0].id;
        }
        rerender();
      });

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
      content: msg.content ?? [{ type: "text", text: msg.text }],
      text: msg.text,
      // Preserve incoming timestamp when provided by the server/backend. If absent,
      // fall back to a monotonic per-index timestamp to keep ordering stable.
  // msg.timestamp may be absent from the ChatMessage type; cast to any to access if present.
  timestamp: typeof (msg as any).timestamp === "number" ? (msg as any).timestamp : Date.now() + index,
    },
  }));
  const grouped = groupMessages(items);
  const session = getCurrentSession();
  if (session && session.isStreaming && grouped.length > 0) {
    const last = grouped[grouped.length - 1];
    if (last.kind === "group" && last.role === "assistant") {
      last.isStreaming = true;
    } else if (last.kind === "group" && last.role === "user") {
        // If the last message is from the user, we want to append an empty assistant group that is streaming
        grouped.push({
            kind: "group",
            key: "group:assistant:pending",
            role: "assistant",
            senderLabel: null,
            messages: [{ message: { role: "assistant", text: " ", content: [] }, key: "pending" }],
            timestamp: Date.now(),
            isStreaming: true
        });
    }
  }
  return grouped;
}


function renderMessageContent(contentArray, fallbackText) {
  const renderText = (text) => {
    if (!text || text === " ") return html`${text}`;
    
    // Check for pipeline block
    const pipelineMatch = text.match(/\`\`\`json\s+pipeline\s+([\s\S]*?)\`\`\`/);
    if (pipelineMatch) {
      const before = text.substring(0, pipelineMatch.index);
      const after = text.substring(pipelineMatch.index + pipelineMatch[0].length);
      let pipelineData = null;
      try {
        pipelineData = JSON.parse(pipelineMatch[1]);
      } catch (e) {
        console.error("Failed to parse pipeline JSON", e);
      }
      
      const pipelineUI = pipelineData ? html`
        <div style="margin: 12px 0; padding: 12px; background: rgba(203,166,247,0.15); border: 1px solid #cba6f7; border-radius: 8px;">
          <h4 style="margin:0 0 8px 0; color: #cba6f7;">🚀 Pipeline Protocol: ${pipelineData.pipelineId || 'Unnamed'}</h4>
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px;">
            <strong>Workspace:</strong> ${pipelineData.workspaceDir || 'current'}<br/>
            <strong>Agents:</strong> ${pipelineData.agents ? pipelineData.agents.map(a => a.id).join(', ') : 'none'}
          </div>
          <button style="background: #cba6f7; color: #1e1e2e; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;" @click=${() => submitComposer("Отлично, развертывай: " + pipelineData.pipelineId)}>
            Execute Pipeline
          </button>
        </div>` : html`<div style="color:red">Invalid pipeline format</div>`;
        
      return html`
        <div class="lain-md">${unsafeHTML(toSanitizedMarkdownHtml(before))}</div>
        ${pipelineUI}
        <div class="lain-md">${unsafeHTML(toSanitizedMarkdownHtml(after))}</div>
      `;
    }

    return html`<div class="lain-md markdown-body" style="word-break: break-word;">${unsafeHTML(toSanitizedMarkdownHtml(text))}</div>`;
  };

  if (!contentArray || !Array.isArray(contentArray) || contentArray.length === 0) {
    return renderText(fallbackText);
  }
  return contentArray.map(item => {
    if (item.type === 'text') {
      return renderText(item.text);
    }
    if (item.type === 'tool_call' || item.name) {
      let argsStr = "";
      if (item.args) {
        argsStr = typeof item.args === 'string' ? item.args : JSON.stringify(item.args, null, 2);
      }
      // truncate long arguments visually
      return html`<div style="margin: 8px 0; background: rgba(203,166,247,0.1); border-left: 2px solid #cba6f7; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em; word-break: break-all;">
        <div style="color: #cba6f7; font-weight: bold; margin-bottom: argsStr ? '4px' : '0';">${item.name || item.type || 'tool'}</div>
        ${argsStr ? html`<div style="opacity: 0.8; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${argsStr}</div>` : ''}
      </div>`;
    }
    if (item.type === 'tool_result') {
      // Check if item.text has pipeline
      if (item.text && item.text.includes('json pipeline')) {
        return html`<div style="margin: 8px 0; background: rgba(166,227,161,0.1); border-left: 2px solid #a6e3a1; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em; word-break: break-all;">
          <div style="color: #a6e3a1; font-weight: bold; margin-bottom: 4px;">${item.name || 'tool_result'}</div>
          ${renderText(item.text)}
        </div>`;
      }
      return html`<div style="margin: 8px 0; background: rgba(166,227,161,0.1); border-left: 2px solid #a6e3a1; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em; word-break: break-all;">
        <div style="color: #a6e3a1; font-weight: bold; margin-bottom: item.text ? '4px' : '0';">${item.name || 'tool_result'}</div>
        ${item.text ? html`<div style="opacity: 0.8; white-space: pre-wrap; max-height: 120px; overflow-y: auto;">${item.text}</div>` : ''}
      </div>`;
    }
    return html`<pre style="font-size:0.85em; opacity:0.8; word-break: break-all;">${JSON.stringify(item, null, 2)}</pre>`;
  });
}

async function _promptRenameCurrent() {
  const current = getCurrentSession();
  if (!current) {
    return;
  }
  const newLabel = prompt("Rename session", current.row.label ?? current.row.subject ?? "");
  if (!newLabel) {
    return;
  }
  try {
    await state.client?.request("sessions.patch", { key: current.row.key, label: newLabel });
    await loadSessionsList();
    await setCurrentContext(current.row.key);
  } catch (_e) {
    state.error = String(e);
    rerender();
  }
}

async function promptGenerateAndRename() {
  const current = getCurrentSession();
  if (!current) {
    return;
  }
  const lastUser = [...current.messages].toReversed().find((m) => m.role === "user");
  const seed = lastUser?.text ?? current.row.subject ?? "New task";
  openTitleModal(seed);
}

async function openTitleModal(seed: string) {
  state.titleModalLoading = true;
  rerender();
  try {
    // Build a short summary from recent messages to base title generation on dialog context
    const session = getCurrentSession();
  const recent = session?.messages ?? [];
  // take the last 3 user/assistant messages (ignore system/tool entries)
  const lastMsgs = recent.filter((m) => m.role === "user" || m.role === "assistant").slice(-3);
  // Exclude tool calls, tool results, and obvious JSON/ID fragments from the convo used for title generation
    function isToolOrJsonText(t?: string) {
      if (!t) {
        return true;
      }
      const s = t.trim();
      // messages produced from tool fragments often start with these markers
      if (/^Tool\s+(call|result)\b/i.test(s)) {
        return true;
      }
      if (/^(Applying|Tool returned|Tool returned)\b/i.test(s)) {
        return true;
      }
      // pure JSON/object/array blobs are useless for title generation
      if (/^[{[]/.test(s)) {
        return true;
      }
      // short hex/id-like tokens (e19a3070, 4179) — ignore
      if (/^[0-9a-fA-F]{3,12}$/.test(s) && !/[aeiouAEIOUаеёиоуыэюяАЕИОУЫЭЮЯ]/.test(s)) {
        return true;
      }
      return false;
    }
    const filteredMsgs = lastMsgs.filter((m) => !isToolOrJsonText(m.text));
    const convoLines = filteredMsgs
      .map((m) => {
        const who = m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System";
        // truncate long messages for the summary
        const txt = m.text.length > 300 ? m.text.slice(0, 300) + "…" : m.text;
        return `${who}: ${txt}`;
      })
      .join("\n");

    const summaryPrompt = `Создай короткое и емкое название (2-4 слова) описывающее эту беседу. Не пиши ничего кроме самого названия, без кавычек и точек.\n\n${convoLines}`;

    // Run title generation in an isolated agent run so we don't write into the session transcript.
    // Do NOT pass sessionKey here; keeping the run unattached prevents the agent from writing into the
    // session. We still set deliver:false so the gateway won't append a visible assistant message.
    const startRes = await state.client?.request("agent", {
      message: summaryPrompt,
      deliver: false,
      // target the current session so we don't spawn a new one, but ask the
      // server not to persist the transcript for this run.
      sessionKey: session?.row?.key,
      agentId: "lain-head",
      idempotencyKey: crypto.randomUUID(),
      noSessionPersistence: true,
    });
    // If the gateway immediately returned an error (e.g. missing target), surface it and stop.
    if (startRes && typeof startRes === "object" && (startRes as any).status === "error") {
      state.error = (startRes as any).error ?? (startRes as any).errorMessage ?? "Agent run failed";
      state.titleModalLoading = false;
      rerender();
      return;
    }

    // If the gateway returned an immediate ack (accepted) with a runId, wait for the final result
    // via agent.wait. This avoids treating the accepted ack as the final payload.
    let res = startRes;
    try {
      if (startRes && typeof startRes === "object" && typeof (startRes as any).runId === "string") {
        const runId = (startRes as any).runId as string;
        try {
          // wait up to 10s for a final result (adjust timeout if needed)
          const waited = await state.client?.request("agent.wait", { runId, timeoutMs: 10000 });
          if (waited) {
            res = waited;
          }
        } catch (_e) {
          // ignore wait errors and fall back to startRes
        }
      }
    } catch (_e) {}

    // Debug helper: expose raw agent response for inspection in the browser console
    try {
      // attach to window so user can inspect after the call
      (window as any).__lastAgentTitleGen = res;
      // also log to console (some environments suppress debug)
      // use console.log to increase visibility
      try {
        console.log("lain: agent raw response", res);
      } catch (_e) {}
    } catch (_e) {}

    let textResult: string | null = null;
    if (res && typeof res === "object") {
      // agent responses commonly come back as payload.result
      const payload = (res as any).result ?? res;
      if (typeof payload === "string") {
        textResult = payload;
      } else if (payload && typeof payload === "object") {
        if (typeof payload.text === "string") {
          textResult = payload.text;
        } else if (typeof payload.message === "string") {
          textResult = payload.message;
        } else if (Array.isArray(payload.content)) {
          textResult = payload.content
            .map((c: any) => c?.text ?? "")
            .filter(Boolean)
            .join("\n");
        } else if (typeof payload.output === "string") {
          textResult = payload.output;
        } else {
          textResult = JSON.stringify(payload);
        }
      }
    }

    // fallback: if no direct text in the agent response, choose the last in-memory assistant
    // message that doesn't look like a tool/JSON fragment. Avoid loading history which can
    // pull in tool-run transcripts.
    if (!textResult) {
      const msgs = getCurrentSession()?.messages ?? [];
      const lastAssistant = [...msgs]
        .toReversed()
        .find((m) => m.role === "assistant" && !isToolOrJsonText(m.text));
      textResult = lastAssistant?.text ?? null;
    }

    // Postprocess potential JSON-like agent output and try to extract readable lines
    try {
      if (textResult && /^[\s{[]|\{"/.test(textResult)) {
        const parsed = JSON.parse(textResult);
        const collect = (v: any): string[] => {
          if (v == null) {
            return [];
          }
          if (typeof v === "string") {
            return [v];
          }
          if (Array.isArray(v)) {
            return v.flatMap((e) => collect(e));
          }
          if (typeof v === "object") {
            return Object.keys(v).flatMap((k) => collect(v[k]));
          }
          return [];
        };
        const flat = collect(parsed).filter(Boolean).join("\n");
        if (flat) {
          textResult = flat;
        }
      }
    } catch (_e) {
      // ignore parse errors — we'll fallback to line filtering below
    }

    let finalTitle = textResult?.trim();
    if (!finalTitle || /^[{[]|^\s*$/.test(finalTitle) || finalTitle.length > 50) {
      console.warn("Generated title seems invalid or too long. Abandoning auto-rename.", finalTitle);
      return;
    }

    finalTitle = finalTitle.replace(/^["'«„]+|["'»”]+$/g, "");

    applyGeneratedTitle(finalTitle);
    return;
  } catch (err) {
    state.error = String(err);
    console.error("Title generation failed:", err);
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

function _parseTitleVariants(text: string): string[] {
  if (!text) {
    return [];
  }
  // split by lines, commas, or semicolons and clean
  const lines = text
    .split(/\r?\n|\s*[-•]\s*|,|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  const cleaned = lines.map((l) => l.replace(/^\s*['"“”`]+|['"“”`]+\s*$/g, ""));
  // further split if first line contains multiple options separated by ";" or ","
  const flat = cleaned.flatMap((l) => l.split(/;|\|/).map((s) => s.trim())).filter(Boolean);
  // keep short variants (<=6 words), else break into phrase fragments
  const uniq: string[] = [];
  for (const v of flat) {
    const words = v.split(/\s+/).filter(Boolean);
    if (words.length > 8) {
      continue;
    }
    const candidate = v.replace(/^Title:\s*/i, "").trim();
    if (candidate && !uniq.includes(candidate)) {
      uniq.push(candidate);
    }
    if (uniq.length >= 5) {
      break;
    }
  }
  return uniq.slice(0, 3);
}

async function applyGeneratedTitle(title: string) {
  const s = getCurrentSession();
  if (!s) {
    return;
  }
  s.nameLoading = true;
  rerender();
  try {
    await state.client?.request("sessions.patch", { key: s.row.key, label: title });
    await loadSessionsList();
    await setCurrentContext(s.row.key);
    closeTitleModal();
  } catch (_e) {
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
    basePath: "/", // fixed 404 control-ui-config
    assistantName: state.assistantName,
    assistantAvatar: state.assistantAvatar,
    assistantAgentId: null,
    serverVersion: null,
  }).then(() => {
    rerender();
  });
  connect();
  setTimeout(initLive2D, 100);
}

void init();

async function initLive2D() {
  const canvas = document.getElementById('lain-live2d-canvas') as HTMLCanvasElement;
  if (!canvas) {return;}
  try {
    const { PIXI } = window as any;
    const { Live2DModel } = PIXI.live2d;
    const model = await Live2DModel.from('/live2d/custom/ChatGPT Image 14 апр.model3.json');
    
    const app = new PIXI.Application({ 
      view: canvas, 
      autoStart: true, 
      backgroundAlpha: 0, 
      resizeTo: canvas.parentElement || window 
    });
    app.stage.addChild(model);
    
    model.autoUpdate = false;
    (window as any).__live2d_model = model;

    model.anchor.set(0.5, 1.0); // anchor to bottom center
    
    const updateSize = () => {
        model.position.set(canvas.width / 2, canvas.height);
        // Calculate scale to fit height
        const scale = (canvas.height / (model.height / model.scale.y)) * 1.0;
        model.scale.set(scale);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);

    let blink = 1.0;
    let blinkT = 100;
    let closing = false;
    let fX = 0, fY = 0;

    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      fX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      fY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    });

    app.ticker.add((delta: number) => {
      const core = model.internalModel.coreModel;
      
      const session = getCurrentSession();
      const sessionMood = inferMood(session?.row || { status: 'idle' } as any, session?.messages || []);
      
      // 1. Моргание (чуть медленнее: 0.1 вместо 0.3)
      if (blinkT <= 0) {closing = true;}
      if (closing) {
        blink -= 0.1 * delta;
        if (blink <= 0) { blink = 0; closing = false; blinkT = 250 + Math.random() * 800; }
      } else if (blink < 1) {
        blink += 0.1 * delta;
        if (blink > 1) {blink = 1;}
      } else { blinkT -= delta; }
      
      // 2. Движение глаз в зависимости от режима
      let targetX = 0;
      let targetY = 0;

      if (sessionMood === "listening") {
        targetX = Math.sin(Date.now() / 1000) * 0.1;
        targetY = 0.2;
      } else if (sessionMood === "thinking" || sessionMood === "executing") {
        targetX = Math.sin(Date.now() / 2000) * 0.5;
        targetY = Math.cos(Date.now() / 3000) * 0.3;
      } else if (sessionMood === "blocked") {
        targetX = 0;
        targetY = -0.5;
      } else {
        // Idle: stay centered with very slight breathing movement
        targetX = Math.sin(Date.now() / 5000) * 0.05;
        targetY = Math.cos(Date.now() / 7000) * 0.05;
      }

      core.setParameterValueById('ParamEyeLOpen', blink);
      core.setParameterValueById('ParamEyeROpen', blink);
      core.setParameterValueById('ParamEyeBallX', targetX);
      core.setParameterValueById('ParamEyeBallY', targetY);
      
      model.update(delta);
    });

    console.log('LIVE2D RE-INIT: Manual loop active');
  } catch (err) {
    console.error('Live2D Error:', err);
  }
}
setTimeout(initLive2D, 1000);
