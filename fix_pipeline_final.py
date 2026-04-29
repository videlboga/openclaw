import re

with open("ui/src/lain/main.ts", "r") as f:
    text = f.read()

# Make the pipeline matching extremely robust
text = re.sub(
    r'const pipelineMatch = text\.match\(/.*?json\\s\*\\n\\s\*\{\\s\*"pipeline":.*?/is\);',
    r'const pipelineMatch = text.match(/(.*?)(?:~~~|```)json[\s\S]*?pipeline[\s\S]*?\n([\s\S]*?(?:\{\s*"pipeline"|pipelineId)[\s\S]*?)(?:~~~|```)(.*)/is);',
    text
)

# Fix the content index since we changed groups
text = text.replace('const pipelineContent = pipelineMatch[3]', 'const pipelineContent = pipelineMatch[2]')
text = text.replace('const after = pipelineMatch[5]', 'const after = pipelineMatch[3]')

with open("ui/src/lain/main.ts", "w") as f:
    f.write(text)
