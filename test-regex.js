const text = \`
Я призову субагентов и заведу Пайплайн.

\`\`\`json pipeline
{
  "pipelineId": "terminal-task-tracker-v1",
  "workspaceDir": "projects/terminal-task-tracker",
  "initialMessage": "Спроектируй лучший в мире...",
  "agents": []
}
\`\`\`
Ты хочешь, чтобы я запустила этот протокол?
\`;
const pipelineMatch = text.match(/(.*?)(~~~|\`\`\`)json[\s]*pipeline\s*\n([\s\S]*?)(~~~|\`\`\`)(.*)/is);
console.log(pipelineMatch ? "Match!" : "No match!");
