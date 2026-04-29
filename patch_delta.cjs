const fs = require("fs");
const file = "ui/src/lain/main.ts";
let content = fs.readFileSync(file, "utf8");

const oldCode = `    const toolStatus = extractToolStatus(payload?.message);
    if (toolStatus) {
      session.toolStatus = toolStatus;
      rerender();
      return;
    }
    const nextMessage = normalizedMessageToChatMessage(payload?.message);
    if (!nextMessage) {
      return;
    }
    session.toolStatus = null;`;

const newCode = `    const toolStatus = extractToolStatus(payload?.message);
    session.toolStatus = toolStatus || null;
    const nextMessage = normalizedMessageToChatMessage(payload?.message);
    if (!nextMessage) {
      rerender();
      return;
    }`;

content = content.replace(oldCode, newCode);

// Also let's check one more issue. The user said: "А потом снова мигающий курсор и неясно что происходит"
// Maybe we can also add a better spinner or text if there is NO toolStatus but we are waiting for TTFT.

fs.writeFileSync(file, content);
console.log("Patched!");
