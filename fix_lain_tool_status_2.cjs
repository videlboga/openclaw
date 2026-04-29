const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

code = code.replace(
  /m\(item\),\s*\)\}/m,
  \`m(item),
                )}
              \${
                getCurrentSession()?.toolStatus
                  ? html\\\`<div class="lain-tool-status" style="margin-top:12px;margin-bottom:12px;font-family:monospace;color:#cba6f7;font-size:0.85em;display:flex;align-items:center;gap:8px;">
                           <div style="width:12px;height:12px;border:2px solid;border-color:#cba6f7 transparent #cba6f7 transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
                           \${getCurrentSession()?.toolStatus}…
                         </div>\\\`
                  : ""
              }\`
);

fs.writeFileSync('ui/src/lain/main.ts', code);
console.log('done fixing tool status 2');
