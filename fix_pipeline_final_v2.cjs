const fs = require('fs');
const path = 'ui/src/lain/main.ts';
let text = fs.readFileSync(path, 'utf8');

// Debug check
const oldRegex = /const pipelineMatch = text\.match\(\/\(\.\*?\)\(~~~\|```\)json\\s\*\\n\\s\*\{\\s\*"pipeline":\(\[\\s\\S\]\*?\)\(~~~\|```\)\(\.\*\)\/is\);/;
console.log('Matches old regex:', oldRegex.test(text));

const newText = text.replace(
  /const pipelineMatch = text\.match\(\/\(\.\*?\)\(~~~\|```\)json\\s\*\\n\\s\*\{\\s\*"pipeline":\(\[\\s\\S\]\*?\)\(~~~\|```\)\(\.\*\)\/is\);/,
  'const pipelineMatch = text.match(/(.*?)(?:~~~|```)json[\\s\\S]*?pipeline[\\s\\S]*?\\n([\\s\\S]*?(?:{[\\s\\S]*?"pipeline"|pipelineId)[\\s\\S]*?)(?:~~~|```)(.*)/is);'
)
.replace('const pipelineContent = pipelineMatch[3] || "{}"', 'const pipelineContent = pipelineMatch[2] || "{}"')
.replace('const after = pipelineMatch[5] || ""', 'const after = pipelineMatch[3] || ""');

if (text !== newText) {
  fs.writeFileSync(path, newText);
  console.log('File updated successfully');
} else {
  console.log('No changes made - regex might not have matched exactly');
}
