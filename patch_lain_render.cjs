const fs = require("fs");
const file = "ui/src/lain/main.ts";
let content = fs.readFileSync(file, "utf8");

const renderFunc = `
function renderMessageContent(contentArray, fallbackText) {
  if (!contentArray || !Array.isArray(contentArray) || contentArray.length === 0) {
    return html\`<div style="white-space: pre-wrap;">\${fallbackText}</div>\`;
  }
  return contentArray.map(item => {
    if (item.type === 'text') {
      // Ignore empty texts from pending assistant
      if (!item.text || item.text === " ") return html\`\${item.text}\`;
      return html\`<div style="white-space: pre-wrap;">\${item.text}</div>\`;
    }
    if (item.type === 'tool_call' || item.name) {
      let argsStr = "";
      if (item.args) {
        argsStr = typeof item.args === 'string' ? item.args : JSON.stringify(item.args, null, 2);
      }
      return html\`<div style="margin: 8px 0; background: rgba(203,166,247,0.1); border-left: 2px solid #cba6f7; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em;">
        <div style="color: #cba6f7; font-weight: bold; margin-bottom: argsStr ? '4px' : '0';">\${item.name || item.type || 'tool'}</div>
        \${argsStr ? html\`<div style="opacity: 0.8; white-space: pre-wrap; word-break: break-all;">\${argsStr}</div>\` : ''}
      </div>\`;
    }
    if (item.type === 'tool_result') {
      return html\`<div style="margin: 8px 0; background: rgba(166,227,161,0.1); border-left: 2px solid #a6e3a1; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em;">
        <div style="color: #a6e3a1; font-weight: bold; margin-bottom: item.text ? '4px' : '0';">\${item.name || 'tool_result'}</div>
        \${item.text ? html\`<div style="opacity: 0.8; white-space: pre-wrap; max-height: 120px; overflow-y: auto;">\${item.text}</div>\` : ''}
      </div>\`;
    }
    return html\`<pre style="font-size:0.85em; opacity:0.8;">\${JSON.stringify(item, null, 2)}</pre>\`;
  });
}
`;

content = content.replace(
  'function renderLainChatItem(item: ChatItem | MessageGroup) {',
  renderFunc + '\nfunction renderLainChatItem(item: ChatItem | MessageGroup) {'
);

const oldBodyRenderer = `      <div class="lain-message__body">\${m.message.text || JSON.stringify(m.message.content)}\${item.isStreaming && m === item.messages[item.messages.length - 1] ? html\`<span class="cursor" style="display:inline-block;width:6px;height:14px;background:#cba6f7;margin-left:4px;vertical-align:text-bottom;animation:blink 1s step-end infinite;"></span>\` : ''}</div>`;
const newBodyRenderer = `      <div class="lain-message__body">\${renderMessageContent(m.message.content, m.message.text)}\${item.isStreaming && m === item.messages[item.messages.length - 1] ? html\`<span class="cursor" style="display:inline-block;width:6px;height:14px;background:#cba6f7;margin-left:4px;vertical-align:text-bottom;animation:blink 1s step-end infinite;"></span>\` : ''}</div>`;

content = content.replace(oldBodyRenderer, newBodyRenderer);

fs.writeFileSync(file, content);
console.log("Patched!");
