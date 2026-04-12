import "./styles.css";
import { html, render } from "lit-html";
import { repeat } from "lit/directives/repeat.js";

type Mood = "idle" | "listening" | "thinking" | "routing" | "executing" | "blocked" | "done";
type Role = "assistant" | "system" | "user";

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
  messages: Array<{ role: Role; text: string }>;
};

const contexts: ContextItem[] = [
  {
    id: "openclaw-control-ui",
    name: "openclaw-control-ui",
    status: "UI shell prototype in flight",
    pipeline: "Implement · Copilot escalation",
    unread: false,
    mood: "routing",
    project: "openclaw/ui",
    ambient: "Threading the shell together without turning it into dashboard sludge.",
    quickActions: ["Implement", "Review", "Polish"],
    draft: "",
    messages: [
      {
        role: "assistant",
        text: "Context shell is live. I can track several project threads here and keep routing logic inline instead of making you babysit model buttons.",
      },
      {
        role: "system",
        text: "Current route: openclaw-control-ui · implement shell structure · preserve minimal surface area.",
      },
    ],
  },
  {
    id: "machine-host",
    name: "machine-host",
    status: "Idle, ready for delegated work",
    pipeline: "Standby",
    unread: false,
    mood: "idle",
    project: "delegated host lane",
    ambient: "Quiet lane, warm engine, no drama yet.",
    quickActions: ["Explore", "Implement"],
    draft: "",
    messages: [
      {
        role: "system",
        text: "No active task. Hand me a repo path, a goal, or a mess to untangle.",
      },
    ],
  },
  {
    id: "machine-vpn",
    name: "machine-vpn",
    status: "VPN workspace attached",
    pipeline: "Explore · Qwen-first",
    unread: true,
    mood: "listening",
    project: "vpn lane",
    ambient: "Watching the stranger wires and pretending they are domesticated.",
    quickActions: ["Explore", "Compare"],
    draft: "Check VPN-side Chromium setup and attached services",
    messages: [
      {
        role: "assistant",
        text: "VPN lane is attached and waiting. Good spot for broad exploration before we escalate anything expensive.",
      },
    ],
  },
  {
    id: "scratchpad",
    name: "scratchpad",
    status: "No active task yet",
    pipeline: "Idle",
    unread: false,
    mood: "idle",
    project: "unassigned",
    ambient: "Blank page energy. Slightly suspicious, but useful.",
    quickActions: ["Explore", "Review", "Compare"],
    draft: "",
    messages: [
      {
        role: "system",
        text: "Scratch context ready. Toss in half-formed ideas, I can work with ugly inputs.",
      },
    ],
  },
];

const state = {
  assistantName: "Lain",
  currentContextId: "openclaw-control-ui",
};

function getCurrentContext(): ContextItem {
  return contexts.find((context) => context.id === state.currentContextId) ?? contexts[0];
}

function inferMoodFromText(text: string): Mood {
  const normalized = text.toLowerCase();
  if (/(blocked|error|fail|stuck|broken)/.test(normalized)) {
    return "blocked";
  }
  if (/(done|fixed|shipped|complete|completed|success)/.test(normalized)) {
    return "done";
  }
  if (/(review|compare|think|investigate)/.test(normalized)) {
    return "thinking";
  }
  if (/(implement|build|edit|patch|wire|connect)/.test(normalized)) {
    return "executing";
  }
  return "routing";
}

function setCurrentContext(contextId: string) {
  state.currentContextId = contextId;
  const context = getCurrentContext();
  context.unread = false;
  rerender();
}

function updateDraft(value: string) {
  getCurrentContext().draft = value;
}

function submitComposer(prefill?: string) {
  const context = getCurrentContext();
  const text = (prefill ?? context.draft).trim();
  if (!text) {
    return;
  }

  context.messages = [
    ...context.messages,
    { role: "user", text },
    {
      role: "assistant",
      text: `Queued in ${context.name}. Route looks like ${context.pipeline.toLowerCase()}. Next step: ${text}.`,
    },
  ];
  context.status = `Task queued · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  context.mood = inferMoodFromText(text);
  context.unread = false;
  context.draft = "";
  rerender();
}

function onComposerKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    submitComposer();
  }
}

function app() {
  const current = getCurrentContext();

  return html`
    <div class="lain-shell mood-${current.mood}">
      <header class="lain-topbar">
        <div class="lain-topbar__left">
          <div class="lain-dot"></div>
          <div class="lain-titleblock">
            <div class="lain-title">${state.assistantName}</div>
            <div class="lain-subtitle">${current.status}</div>
          </div>
        </div>
        <div class="lain-topbar__meta">
          <span class="pill">${current.pipeline}</span>
        </div>
      </header>

      <main class="lain-main">
        <aside class="lain-contexts">
          <div class="lain-section-label">contexts</div>
          <div class="lain-context-list">
            ${repeat(
              contexts,
              (context) => context.id,
              (context) => html`
                <button
                  class="lain-context ${context.id === state.currentContextId ? "is-active" : ""}"
                  @click=${() => setCurrentContext(context.id)}
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
              <div class="lain-project">Current project: ${current.project}</div>
              <div class="lain-context-label">Context: ${current.id}</div>
            </div>
            <div class="lain-quick-actions">
              ${repeat(
                current.quickActions,
                (action) => action,
                (action) => html`
                  <button
                    class="lain-chip"
                    @click=${() => submitComposer(`${action} ${current.project}`)}
                  >
                    ${action}
                  </button>
                `,
              )}
            </div>
          </div>

          <div class="lain-messages">
            ${repeat(
              current.messages,
              (_, index) => `${current.id}-${index}`,
              (msg) => html`
                <article class="lain-message lain-message--${msg.role}">
                  <div class="lain-message__role">${msg.role}</div>
                  <div class="lain-message__body">${msg.text}</div>
                </article>
              `,
            )}
          </div>

          <label class="lain-composer">
            <textarea
              .value=${current.draft}
              @input=${(event: Event) => updateDraft((event.target as HTMLTextAreaElement).value)}
              @keydown=${onComposerKeydown}
              placeholder="Give Lain a task, a project path, or a question..."
            ></textarea>
            <div class="lain-composer__footer">
              <div class="lain-composer__hint">Ctrl/⌘ + Enter to queue</div>
              <button class="lain-send" @click=${() => submitComposer()}>Queue task</button>
            </div>
          </label>
        </section>

        <aside class="lain-persona">
          <div class="lain-portrait-wrap">
            <div class="lain-portrait-glow"></div>
            <div class="lain-portrait">L</div>
          </div>
          <div class="lain-state">${current.mood}</div>
          <div class="lain-ambient">${current.ambient}</div>
        </aside>
      </main>
    </div>
  `;
}

function rerender() {
  render(app(), document.body);
}

rerender();
