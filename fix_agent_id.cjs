const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf-8');

code = code.replace(
  'sessionKey: session.row.key,\n      agentId: "lain-head",',
  'sessionKey: session.row.key,'
);

fs.writeFileSync('ui/src/lain/main.ts', code);
