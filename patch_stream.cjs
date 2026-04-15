const { readFileSync, writeFileSync } = require('fs');
const file = 'extensions/github-copilot/stream.ts';
let code = readFileSync(file, 'utf8');
code = code.replace(
  '(payload: Record<string, any>) => {',
  '(payload: Record<string, any>) => {\n          require("fs").writeFileSync("/tmp/debug_copilot_payload.json", JSON.stringify(payload, null, 2));'
);
writeFileSync(file, code);
