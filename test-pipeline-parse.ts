const text = \`
Я призову субагентов и заведу Пайплайн для создания лучшего терминального таск-трекера. Коротко: спроектируем UX командной строки, выберем стек, сделаем skeleton, тесты, доку и ревью.

\`\`\`json pipeline
{
  "pipelineId": "terminal-task-tracker-v1",
  "workspaceDir": "projects/terminal-task-tracker",
  "initialMessage": "Спроектируй лучший в мире терминальный таск-трекер.",
  "agents": []
}
\`\`\`
Ты хочешь, чтобы я запустила этот протокол?\`;

const pipelineMatch = text.match(/(.*?)(~~~|\`\`\`)json[\s]*pipeline\s*\\n([\\s\\S]*?)(~~~|\`\`\`)(.*)/is);
console.log("Match?", !!pipelineMatch);
if (pipelineMatch) {
  console.log("JSON:", pipelineMatch[3]);
}
