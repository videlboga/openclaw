const fs = require('fs');
let text = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

text = text.replace(
  /\$\{\s*getCurrentSession\(\)\?\.toolStatus\s*\?\s*html`<div class="lain-tool-status">\$\{getCurrentSession\(\)\?\.toolStatus\}…<\/div>`\s*:\s*""\s*\}/m,
  ''
);

fs.writeFileSync('ui/src/lain/main.ts', text);
