import os

path = 'ui/src/lain/main.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Add agentId: "lain-head" to chat.send request to match createNewSession
old_send_block = """    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: true,
      idempotencyKey: crypto.randomUUID(),"""

new_send_block = """    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: true,
      agentId: "lain-head",
      idempotencyKey: crypto.randomUUID(),"""

if old_send_block in content:
    content = content.replace(old_send_block, new_send_block)
    print("Added agentId to chat.send")
else:
    print("Could not find chat.send block for agentId fix")

# 2. Add log to handleGatewayEvent to see incoming packets
old_handle_event = 'function handleGatewayEvent(evt: GatewayEventFrame) {'
new_handle_event = 'function handleGatewayEvent(evt: GatewayEventFrame) {\n  console.log("Lain Event:", evt.event, evt.payload);'

if old_handle_event in content:
    content = content.replace(old_handle_event, new_handle_event)
    print("Added event logging")
else:
    print("Could not find handleGatewayEvent")

with open(path, 'w') as f:
    f.write(content)
