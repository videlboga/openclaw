const fs = require("fs");
const path = "ui/src/lain/main.ts";
let content = fs.readFileSync(path, "utf-8");

// Change from creating programmatic element back to just putting the tag 
// in the literal HTML with empty children. Since lit-html just patches existing trees,
// and openclaw-app handles its shadow/light children itself, a pure tag works best.
// If it was purging lit-html, we'll just put it back and test.

let replaced = false;

const pattern = /<div style="flex: 1; display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden;" \${ref\(\(el\) => {[\s\S]*?}\)}><\/div>/m;

if (pattern.test(content)) {
  content = content.replace(pattern, `<openclaw-app id="lain-chat-embed" focus-mode="true" style="width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; flex: 1;"></openclaw-app>`);
  fs.writeFileSync(path, content, "utf-8");
  console.log("Replaced ref logic with plain custom element tag");
} else {
  console.log("Pattern not found");
}

