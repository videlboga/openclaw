const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf-8');

const oldRenderLainChatItem = /function renderLainChatItem[\s\S]*?return nothing;\n}/m;

const newRenderLainChatItem = `function renderLainChatItem(item: ChatItem | MessageGroup) {
  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (item.kind === "reading-indicator") {
    return html\`<div class="lain-message lain-message--system" style="margin-bottom: 14px;">
      <div class="lain-message__role">System</div>
      <div class="lain-message__body" style="opacity: 0.7;">Thinking...</div>
    </div>\`;
  }
  if (item.kind === "stream") {
    return html\`<div class="lain-message lain-message--assistant" style="margin-bottom: 14px;">
      <div class="lain-message__role" style="display: flex; justify-content: space-between;">
        <span>\${state.assistantName}</span>
        <span style="opacity: 0.5;">\${formatTime(item.startedAt)}</span>
      </div>
      <div class="lain-message__body" style="opacity: 0.8;">\${item.text}<span class="cursor" style="display:inline-block;width:6px;height:14px;background:#cba6f7;margin-left:4px;vertical-align:text-bottom;animation:blink 1s step-end infinite;"></span></div>
    </div>\`;
  }
  if (item.kind === "group") {
    return html\`\${item.messages.map(m => html\`<div class="lain-message lain-message--\${item.role}" style="margin-bottom: 14px;">
      <div class="lain-message__role" style="display: flex; justify-content: space-between;">
        <span>\${item.role === 'assistant' ? state.assistantName : (item.role === 'user' ? 'Me' : 'System')}</span>
        <span style="opacity: 0.5;">\${formatTime(m.message.timestamp || item.timestamp)}</span>
      </div>
      <div class="lain-message__body">\${m.message.text || JSON.stringify(m.message.content)}</div>
    </div>\`)}\`;
  }
  return nothing;
}`;

code = code.replace(oldRenderLainChatItem, newRenderLainChatItem);
fs.writeFileSync('ui/src/lain/main.ts', code);
