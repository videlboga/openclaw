const fs = require('fs');
let text = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

const target = `          <div class="lain-messages chat-thread">
            <div class="chat-thread-inner">
              \${repeat(
                buildLainChatItems(current?.messages ?? []),
                (item) => item.key,
                (item) => renderLainChatItem(item),
              )}
            </div>
          </div>`;

const repl = `          <div class="lain-messages chat-thread">
            <div class="chat-thread-inner">
              \${repeat(
                buildLainChatItems(current?.messages ?? []),
                (item) => item.key,
                (item) => renderLainChatItem(item),
              )}
              \${
                getCurrentSession()?.toolStatus
                  ? html\`<div class="lain-tool-status" style="margin-top:12px;margin-bottom:12px;font-family:monospace;color:#cba6f7;font-size:0.85em;display:flex;align-items:center;gap:8px;opacity:0.8;">
                           <div style="width:14px;height:14px;border:2px solid;border-color:#cba6f7 transparent #cba6f7 transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
                           \${getCurrentSession()?.toolStatus}…
                         </div>\`
                  : ""
              }
            </div>
          </div>`;

if (text.includes(target)) {
  text = text.replace(target, repl);
  fs.writeFileSync('ui/src/lain/main.ts', text);
  console.log('Patch success');
} else {
  console.log('Target not found. It might have different spacing. Let me try regex.');
  text = text.replace(/m\(item\),\n\s*\)\}\n\s*<\/div>\n\s*<\/div>/, 
`m(item),
              )}
              \${
                getCurrentSession()?.toolStatus
                  ? html\`<div class="lain-tool-status" style="margin-top:12px;margin-bottom:12px;font-family:monospace;color:#cba6f7;font-size:0.85em;display:flex;align-items:center;gap:8px;opacity:0.8;">
                           <div style="width:14px;height:14px;border:2px solid;border-color:#cba6f7 transparent #cba6f7 transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
                           \${getCurrentSession()?.toolStatus}…
                         </div>\`
                  : ""
              }
            </div>
          </div>`
  );
  fs.writeFileSync('ui/src/lain/main.ts', text);
  console.log('Regex patch attempted');
}
