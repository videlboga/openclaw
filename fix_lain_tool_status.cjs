const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

code = code.replace(
  /\s*\$\{\s*getCurrentSession\(\)\?\.toolStatus\s*\?\s*html`<div class="lain-tool-status">\$\{getCurrentSession\(\)\?\.toolStatus\}…<\/div>`\s*:\s*""\s*\}/m,
  ''
);

code = code.replace(
  /\$\(item\)\s*=>\s*renderLainChatItem\(item\),\s*\)\}/m,
  `(item) => renderLainChatItem(item),
                )}
              \${
                getCurrentSession()?.toolStatus
                  ? html\`<div class="lain-tool-status" style="margin-top:12px;margin-bottom:12px;font-family:monospace;color:#cba6f7;font-size:0.85em;display:flex;align-items:center;gap:8px;">
                           <div class="lain-tool-status__spinner" style="width:12px;height:12px;border:2px solid;border-color:#cba6f7 transparent #cba6f7 transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
                           \${getCurrentSession()?.toolStatus}…
                         </div>\`
                  : ""
              }`
);

fs.writeFileSync('ui/src/lain/main.ts', code);
console.log('done fixing tool status');
