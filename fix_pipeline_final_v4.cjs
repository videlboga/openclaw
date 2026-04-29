const fs = require('fs');
const path = 'ui/src/lain/main.ts';
let text = fs.readFileSync(path, 'utf8');

// The earlier run might have failed to replace text.match because it already looked like the target.
// Let's just do a clean replacement of the whole block.

const targetBlock = `      const pipelineMatch = text.match(/(.*?)(?:~~~|\\\\\`\\\\\`\\\\\`)json[\\\\s\\\\S]*?pipeline[\\\\s\\\\S]*?\\\\n([\\\\s\\\\S]*?(?:{[\\\\s\\\\S]*?"pipeline"|pipelineId)[\\\\s\\\\S]*?)(?:~~~|\\\\\`\\\\\`\\\\\`)(.*)/is);
      if (pipelineMatch) {
         const before = pipelineMatch[1] || "";
         const pipelineContent = pipelineMatch[2] || "{}";
         const after = pipelineMatch[3] || "";`;

// Actually let's just use replace with a simpler search
text = text.replace(/const pipelineMatch = text\.match\([\s\S]*?\);\n\s*if \(pipelineMatch\) \{[\s\S]*?const pipelineContent = pipelineMatch\[\d+\][\s\S]*?const after = pipelineMatch\[\d+\]/ , 
`const pipelineMatch = text.match(/(.*?)(?:~~~|\\\`\\\`\\\`)json[\\s\\S]*?pipeline[\\s\\S]*?\\n([\\s\\S]*?(?:{[\\s\\S]*?"pipeline"|pipelineId)[\\s\\S]*?)(?:~~~|\\\`\\\`\\\`)(.*)/is);
      if (pipelineMatch) {
         const before = pipelineMatch[1] || "";
         const pipelineContent = pipelineMatch[2] || "{}";
         const after = pipelineMatch[3] || ""`);

fs.writeFileSync(path, text);
console.log('Final replacement attempted');
