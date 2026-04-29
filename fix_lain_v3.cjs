const fs = require('fs');
const code = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

let newCode = code.replace(
  /session\.messages = \[\s*\.\.\.session\.messages,\s*\{\s*role:\s*"user",\s*text,\s*timestamp:\s*Date\.now\(\)\s*\}\s*\];\s+session\.draft\s*=\s*"";\s+state\.sending\s*=\s*true;\s+state\.error\s*=\s*null;\s+rerender\(\);/,
  `session.messages = [...session.messages, { role: "user", text, timestamp: Date.now() }];
  session.draft = "";
  // Force clearing the DOM textarea here
  const textarea = document.querySelector(".lain-composer__textarea");
  if (textarea) textarea.value = "";
  state.sending = true;
  state.error = null;
  // While we wait for the gateway to respond, assume we're streaming/loading.
  session.isStreaming = true; 
  rerender();`
);

let newCode2 = newCode.replace(
  /session\.isStreaming = true;\s*break;\s*case "final":\s*case "aborted":\s*case "error":\s*session\.isStreaming = false;\s*break;/,
  `session.isStreaming = true;
        break;
      case "final":
      case "aborted":
      case "error":
        session.isStreaming = false;
        break;`
); // no change, this wasn't the target

fs.writeFileSync('ui/src/lain/main.ts', newCode);
console.log('done replacing');
