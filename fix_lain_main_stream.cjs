const fs = require('fs');
let code = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

code = code.replace(
  'return groupMessages(items);',
  `const grouped = groupMessages(items);
  const session = getCurrentSession();
  if (session && session.isStreaming && grouped.length > 0) {
    const last = grouped[grouped.length - 1];
    if (last.kind === "group" && last.role === "assistant") {
      last.isStreaming = true;
    } else if (last.kind === "group" && last.role === "user") {
        // If the last message is from the user, we want to append an empty assistant group that is streaming
        grouped.push({
            kind: "group",
            key: "group:assistant:pending",
            role: "assistant",
            senderLabel: null,
            messages: [{ message: { role: "assistant", text: "" }, key: "pending" }],
            timestamp: Date.now(),
            isStreaming: true
        });
    }
  }
  return grouped;`
);

fs.writeFileSync('ui/src/lain/main.ts', code);
console.log('done replacing in buildLainChatItems');
