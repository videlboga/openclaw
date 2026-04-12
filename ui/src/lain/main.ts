import "./styles.css";
import { html, render } from "lit-html";
import { repeat } from "lit/directives/repeat.js";
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
type Role = "assistant" | "system" | "user";

type ChatMessage = {
  role: Role;
  text: string;
};

type ContextItem = {
  id: string;
  name: string;
  status: string;
  pipeline: string;
  unread: boolean;
  mood: Mood;
  project: string;
  ambient: string;
  quickActions: string[];
  draft: string;
  messages: ChatMessage[];
  updatedAt: number;
};

type SessionState = {
  row: GatewaySessionRow;
  messages: ChatMessage[];
  draft: string;
  unread: boolean;
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
};

function normalizeTextFromMessage(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }
  const record = message as Record<string, unknown>;
  if (typeof record.text === "string") {
    return record.text;
  }
  if (Array.isArray(record.content)) {
    return record.content
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        const chunk = part as Record<string, unknown>;
        return typeof chunk.text === "string" ? chunk.text : "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function toRole(value: unknown): Role {
  return value === "user" || value === "system" || value === "assistant" ? value : "system";
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
  if (row.abortedLastRun) return "blocked";
  if (row.status === "running") return "executing";
  if (messages.length === 0) return "idle";
  const last = messages[messages.length - 1]?.text?.toLowerCase() ?? "";
  if (/(error|failed|blocked|unauthorized)/.test(last)) return "blocked";
  if (/(done|fixed|complete|success)/.test(last)) return "done";
  if (/(review|investigate|analyze|compare)/.test(last)) return "thinking";
  if (/(implement|build|patch|wire|connect)/.test(last)) return "executing";
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
    unread: false,
  };
  liveSessions.set(row.key, created);
  return created;
}

function buildContexts(): ContextItem[] {
  return Array.from(liveSessions.values())
    .sort((a, b) => (b.row.updatedAt ?? 0) - (a.row.updatedAt ?? 0))
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
        quickActions: ["Explore", "Implement", "Review"],
        draft: session.draft,
        messages: session.messages,
        updatedAt: row.updatedAt ?? 0,
      };
    });
}

async function loadSessionsList() {
  if (!state.client || !state.connected) return;
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
  if (!state.client || !state.connected) return;
  const session = liveSessions.get(sessionKey);
  if (!session) return;
  state.chatLoading = true;
  rerender();
  try {
    const res = await state.client.request<{ messages?: Array<unknown> }>("chat.history", {
      sessionKey,
      limit: 120,
    });
    session.messages = (res.messages ?? [])
      .map((message) => ({
        role: toRole((message as Record<string, unknown>)?.role),
        text: normalizeTextFromMessage(message),
      }))
      .filter((message) => message.text.trim().length > 0);
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
}

function updateDraft(value: string) {
  const session = getCurrentSession();
  if (!session) return;
  session.draft = value;
}

async function submitComposer(prefill?: string) {
  const session = getCurrentSession();
  if (!session || !state.client || !state.connected || state.sending) return;
  const text = (prefill ?? session.draft).trim();
  if (!text) return;
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
    });
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

function onComposerKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
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
  if (!sessionKey) return;
  const session = liveSessions.get(sessionKey);
  if (!session) {
    void loadSessionsList();
    return;
  }
  if (runState === "delta") {
    const text = normalizeTextFromMessage(payload?.message);
    if (!text.trim()) return;
    const last = session.messages[session.messages.length - 1];
    if (last?.role === "assistant") {
      last.text = text;
    } else {
      session.messages = [...session.messages, { role: "assistant", text }];
    }
  }
  if (runState === "final" || runState === "aborted") {
    const text = normalizeTextFromMessage(payload?.message);
    if (text.trim()) {
      const last = session.messages[session.messages.length - 1];
      if (last?.role === "assistant") {
        last.text = text;
      } else {
        session.messages = [...session.messages, { role: "assistant", text }];
      }
    }
    if (sessionKey !== state.currentContextId) {
      session.unread = true;
    }
    void loadSessionsList();
  }
  if (runState === "error") {
    const errorMessage =
      typeof payload?.errorMessage === "string" ? payload.errorMessage : "chat error";
    session.messages = [...session.messages, { role: "system", text: errorMessage }];
  }
  rerender();
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

function app() {
  const contexts = buildContexts();
  const current = contexts.find((context) => context.id === state.currentContextId) ?? contexts[0];

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
          <span class="pill">${current?.pipeline ?? state.pipeline}</span>
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
              ${current
                ? repeat(
                    current.quickActions,
                    (action) => action,
                    (action) => html`
                      <button class="lain-chip" @click=${() => void submitComposer(`${action} ${current.project}`)}>
                        ${action}
                      </button>
                    `,
                  )
                : ""}
            </div>
          </div>

          <div class="lain-messages">
            ${current
              ? repeat(
                  current.messages,
                  (_, index) => `${current.id}-${index}`,
                  (msg) => html`
                    <article class="lain-message lain-message--${msg.role}">
                      <div class="lain-message__role">${msg.role}</div>
                      <div class="lain-message__body">${msg.text}</div>
                    </article>
                  `,
                )
              : html`<article class="lain-message lain-message--system"><div class="lain-message__role">system</div><div class="lain-message__body">Waiting for live session data.</div></article>`}
          </div>

          <label class="lain-composer">
            <textarea
              .value=${current?.draft ?? ""}
              ?disabled=${!state.connected || !current}
              @input=${(event: Event) => updateDraft((event.target as HTMLTextAreaElement).value)}
              @keydown=${onComposerKeydown}
              placeholder="Give Lain a task, a project path, or a question..."
            ></textarea>
            <div class="lain-composer__footer">
              <div class="lain-composer__hint">
                ${state.connected ? "Ctrl/⌘ + Enter to send into live session" : "Gateway offline"}
              </div>
              <button class="lain-send" ?disabled=${!state.connected || !current || state.sending} @click=${() => void submitComposer()}>
                ${state.sending ? "Sending..." : "Send"}
              </button>
            </div>
          </label>
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
