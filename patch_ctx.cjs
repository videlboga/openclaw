const fs = require('fs');
let txt = fs.readFileSync('ui/src/lain/main.ts', 'utf8');

const target = `async function setCurrentContext(contextId: string) {
  state.currentContextId = contextId;
  const session = liveSessions.get(contextId);
  if (session) {
    session.unread = false;
  }
  rerender();
  await loadChatHistory(contextId);
  // after history loads and DOM updates, scroll to bottom to show latest message
  requestAnimationFrame(() => scrollChatToBottom(true));
}`;

const replacement = `async function setCurrentContext(contextId: string) {
  state.currentContextId = contextId;
  const session = liveSessions.get(contextId);
  if (session) {
    session.unread = false;
  }
  
  // Sync the standard openclaw-app embedded instance
  const url = new URL(window.location.href);
  url.searchParams.set("session", contextId);
  window.history.pushState(null, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));

  rerender();
  await loadChatHistory(contextId);
  // after history loads and DOM updates, scroll to bottom to show latest message
  requestAnimationFrame(() => scrollChatToBottom(true));
}`;

if (txt.includes(target)) {
  fs.writeFileSync('ui/src/lain/main.ts', txt.replace(target, replacement));
}
