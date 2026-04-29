import re

with open("ui/src/lain/main.ts", "r") as f:
    text = f.read()

# Make the pipeline matching more robust against the copied strings
text = re.sub(
    r"const pipelineMatch = text\.match\(/\(.*?\)~~~json pipeline\\n\(\[\\s\\S\]*?\)~~~\(.*\)/is\) \|\| text\.match\(/\(.*?\)```json pipeline\\n\(\[\\s\\S\]*?\)```\(.*\)/is\);",
    r"const pipelineMatch = text.match(/(.*?)(?:~~~|```)json\s*pipeline\s*\n([\s\S]*?)(?:~~~|```)(.*)/is);",
    text
)

with open("ui/src/lain/main.ts", "w") as f:
    f.write(text)
