import os

path = '/home/cyberkitty/Projects/openclaw/ui/src/lain/main.ts'
with open(path, 'r') as f:
    content = f.read()

# The user mentions "nothing happens". 
# In submitComposer, deliver: false was set. 
# deliver: true (default) ensures the message is actually processed by the agent.
# deliver: false is usually for injecting notes/context without a reply.

old_send = """    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: false,"""

new_send = """    await state.client.request("chat.send", {
      sessionKey: session.row.key,
      message: text,
      deliver: true,"""

if old_send in content:
    content = content.replace(old_send, new_send)
    with open(path, 'w') as f:
        f.write(content)
    print("Changed deliver: false to deliver: true")
else:
    print("Could not find chat.send with deliver: false")
