const fs = require('fs');
let text = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

text = text.replace(
  'session.draft = "";\n  state.sending = true;',
  `session.draft = "";
  const el = document.querySelector(".lain-composer__textarea") as HTMLTextAreaElement;
  if (el) el.value = "";
  session.isStreaming = true; // Show indicator immediately
  state.sending = true;`
);

fs.writeFileSync('ui/src/lain/main.ts', text);
console.log('done via string replace');
