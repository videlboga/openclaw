const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf-8');

// Replace renderLainChatItem with custom HTML
const oldRenderLainChatItem = `function renderLainChatItem(item: ChatItem | MessageGroup) {
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
}`;

const newRenderLainChatItem = `function renderLainChatItem(item: ChatItem | MessageGroup) {
  if (item.kind === "reading-indicator") {
    return html\`<div class="lain-message lain-message--system"><div class="lain-message__body">...</div></div>\`;
  }
  if (item.kind === "stream") {
    return html\`<div class="lain-message lain-message--assistant"><div class="lain-message__role">\${state.assistantName}</div><div class="lain-message__body">\${item.text}</div></div>\`;
  }
  if (item.kind === "group") {
    return html\`\${item.messages.map(m => html\`<div class="lain-message lain-message--\${item.role}">
      \${item.role !== "user" ? html\`<div class="lain-message__role">\${item.role === 'assistant' ? state.assistantName : 'System'}</div>\` : ''}
      <div class="lain-message__body">\${m.message.text || JSON.stringify(m.message.content)}</div>
    </div>\`)}\`;
  }
  return nothing;
}`;

code = code.replace(oldRenderLainChatItem, newRenderLainChatItem);

// Add agentId back to submitComposer
code = code.replace(
  'sessionKey: session.row.key,',
  'sessionKey: session.row.key,\n      agentId: "lain-head",'
);

code = code.replace(
  'basePath: "",',
  'basePath: "/", // fixed 404 control-ui-config'
);

fs.writeFileSync('ui/src/lain/main.ts', code);
