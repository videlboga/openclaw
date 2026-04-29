import re

with open("ui/src/lain/main.ts", "r") as f:
    text = f.read()

text = re.sub(
    r"""  if \(runState === "delta"\) \{
    session\.isStreaming = true;
    session\.isStreaming = true;
    const toolStatus = extractToolStatus\(payload\?\.message\);
    if \(toolStatus\) \{
      session\.toolStatus = toolStatus;
      rerender\(\);
      return;
    \}
    const nextMessage = normalizedMessageToChatMessage\(payload\?\.message\);
    if \(\!nextMessage\) \{
      return;
    \}
    session\.toolStatus = null;
    const last = session\.messages\[session\.messages\.length - 1\];""",
    """  if (runState === "delta") {
    session.isStreaming = true;
    const toolStatus = extractToolStatus(payload?.message);
    if (toolStatus) {
      session.toolStatus = toolStatus;
    } else {
      session.toolStatus = null;
    }
    
    // We do NOT return early here because we want to update the text progressively
    // even if a tool is currently active according to extractToolStatus
    
    const nextMessage = normalizedMessageToChatMessage(payload?.message);
    if (!nextMessage) {
      rerender();
      return;
    }
    session.toolStatus = null;
    const last = session.messages[session.messages.length - 1];""",
    text,
    count=1
)

text = re.sub(
    r"""  if \(runState === "final" \|\| runState === "aborted"\) \{
    session\.isStreaming = false;
    session\.isStreaming = false;
    session\.toolStatus = null;""",
    """  if (runState === "final" || runState === "aborted") {
    session.isStreaming = false;
    session.toolStatus = null;""",
    text,
    count=1
)

text = re.sub(
    r"""  if \(runState === "error"\) \{
    session\.isStreaming = false;
    session\.isStreaming = false;
    session\.toolStatus = null;""",
    """  if (runState === "error") {
    session.isStreaming = false;
    session.toolStatus = null;""",
    text,
    count=1
)

with open("ui/src/lain/main.ts", "w") as f:
    f.write(text)

