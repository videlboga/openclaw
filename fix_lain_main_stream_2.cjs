const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

code = code.replace(
  'messages: [{ message: { role: "assistant", text: "" }, key: "pending" }],',
  'messages: [{ message: { role: "assistant", text: " ", content: [] }, key: "pending" }],'
);

fs.writeFileSync('ui/src/lain/main.ts', code);
console.log('done fixing undefined text rendering');
