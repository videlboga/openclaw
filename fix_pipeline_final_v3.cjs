const fs = require('fs');
const path = 'ui/src/lain/main.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const pipelineMatch = text.match')) {
    console.log('Found line at index', i, ':', lines[i]);
    lines[i] = '      const pipelineMatch = text.match(/(.*?)(?:~~~|```)json[\\s\\S]*?pipeline[\\s\\S]*?\\n([\\s\\S]*?(?:{[\\s\\S]*?"pipeline"|pipelineId)[\\s\\S]*?)(?:~~~|```)(.*)/is);';
  }
  if (lines[i].includes('const pipelineContent = pipelineMatch[3]')) {
    lines[i] = lines[i].replace('pipelineMatch[3]', 'pipelineMatch[2]');
  }
  if (lines[i].includes('const after = pipelineMatch[5]')) {
    lines[i] = lines[i].replace('pipelineMatch[5]', 'pipelineMatch[3]');
  }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('File updated successfully');
