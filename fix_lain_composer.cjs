const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

code = code.replace(
  /session\.messages\s*=\s*\[\s*\.\.\.session\.messages,\s*\{\s*role:\s*"user",\s*text,\s*timestamp:\s*Date\.now\(\)\s*\}\s*\];\s*session\.draft\s*=\s*"";\s*state\.sending\s*=\s*true;\s*state\.error\s*=\s*null;\s*rerender\(\);/,
  `session.messages = [...session.messages, { role: "user", text, timestamp: Date.now() }];
  session.draft = "";
  
  // Force reset DOM value since lit-html may not catch identical obj ref change
  const textarea = document.querySelector(".lain-composer__textarea") as HTMLTextAreaElement;
  if (textarea) textarea.value = "";

  state.sending = true;
  state.error = null;
  // Make it appear as loading immediately
  session.isStreaming = true; 
  rerender();`
);

fs.writeFileSync('ui/src/lain/main.ts', code);
console.log('done replacing');
