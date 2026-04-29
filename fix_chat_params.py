import os

path = 'ui/src/lain/main.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Remove agentId from chat.send as indicated by the error
# 2. Add deliver: true (which we already had, but let's confirm it's still there)
# 3. Use start_agent instead of chat.send if we want to ensure a specific agent is triggered,
#    OR just trust that the session is already bound to the agent.
# Since createNewSession uses agentId: "lain-head", the session should be bound.

old_send_block = """    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: true,
      agentId: "lain-head",
      idempotencyKey: crypto.randomUUID(),"""

new_send_block = """    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: true,
      idempotencyKey: crypto.randomUUID(),"""

if old_send_block in content:
    content = content.replace(old_send_block, new_send_block)
    print("Removed agentId from chat.send")
else:
    print("Could not find chat.send block with agentId")

with open(path, 'w') as f:
    f.write(content)
