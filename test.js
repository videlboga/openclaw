const text = `
test

\`\`\`json pipeline
{
  "test": 123
}
\`\`\`
`;
const pipelineMatch = text.match(/(.*?)(~~~|\`\`\`)json[\s]*pipeline\s*\n([\s\S]*?)(~~~|\`\`\`)(.*)/is);
console.log(!!pipelineMatch);
