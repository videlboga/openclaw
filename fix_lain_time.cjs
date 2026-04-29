const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf-8');

// 1. Add timestamp to ChatMessage
code = code.replace(
  'type ChatMessage = {\n  id?: string;',
  'type ChatMessage = {\n  id?: string;\n  timestamp?: number;'
);

// 2. Add isStreaming to SessionState
code = code.replace(
  'unread: boolean;',
  'unread: boolean;\n  isStreaming?: boolean;'
);

// 3. Store timestamp in submitComposer
code = code.replace(
  'session.messages = [...session.messages, { role: "user", text }];',
  'session.messages = [...session.messages, { role: "user", text, timestamp: Date.now() }];'
);

// 4. normalizeMessageToChatMessage to return timestamp
const oldNorm = `  if (role === "tool") {
    return { id: normalized.id, role: role as Role, text, content };
  }

  if (role === "assistant" || role === "system" || role === "user") {
    return { id: normalized.id, role: role as Role, text, content };
  }

  return { id: normalized.id, role: "system", text, content };
}`;
const newNorm = `  if (role === "tool") {
    return { id: normalized.id, role: role as Role, text, content, timestamp: normalized.timestamp };
  }

  if (role === "assistant" || role === "system" || role === "user") {
    return { id: normalized.id, role: role as Role, text, content, timestamp: normalized.timestamp };
  }

  return { id: normalized.id, role: "system", text, content, timestamp: normalized.timestamp };
}`;
code = code.replace(oldNorm, newNorm);

// 5. Handle delta, final properly and set streaming indicators
code = code.replace(
  'if (runState === "delta") {',
  'if (runState === "delta") {\n    session.isStreaming = true;'
);
code = code.replace(
  'if (runState === "final" || runState === "aborted") {',
  'if (runState === "final" || runState === "aborted") {\n    session.isStreaming = false;'
);
code = code.replace(
  'if (runState === "error") {',
  'if (runState === "error") {\n    session.isStreaming = false;'
);

// 6. Update buildLainChatItems to mark the LAST message inside the group as streaming
const oldBuild = `  const items: ChatItem[] = messages.map((msg, index) => ({
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
  return groupMessages(items);`;

const newBuild = `  const items: ChatItem[] = messages.map((msg, index) => ({
    kind: "message",
    key: messageKey(msg, index),
    message: {
      role: msg.role,
      content: msg.content ?? [{ type: "text", text: msg.text }],
      text: msg.text,
      timestamp: typeof msg.timestamp === "number" ? msg.timestamp : Date.now(),
    },
  }));
  const groups = groupMessages(items);
  if (groups.length > 0) {
    const session = getCurrentSession();
    if (session && session.isStreaming) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup.kind === "group" && lastGroup.role === "assistant") {
        lastGroup.isStreaming = true;
      }
    }
  }
  return groups;`;

code = code.replace(oldBuild, newBuild);

// 7. Update renderLainChatItem to render the streaming indicator dynamically based on group.isStreaming
const oldRender = '      <div class="lain-message__body">${m.message.text || JSON.stringify(m.message.content)}</div>';
const newRender = '      <div class="lain-message__body">${m.message.text || JSON.stringify(m.message.content)}${item.isStreaming && m === item.messages[item.messages.length - 1] ? html`<span class="cursor" style="display:inline-block;width:6px;height:14px;background:#cba6f7;margin-left:4px;vertical-align:text-bottom;animation:blink 1s step-end infinite;"></span>` : \'\'}</div>';
code = code.replace(oldRender, newRender);

fs.writeFileSync('ui/src/lain/main.ts', code);
