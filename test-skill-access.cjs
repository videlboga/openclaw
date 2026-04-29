const fs = require('fs');
const path = '/home/cyberkitty/Projects/openclaw/skills/taskflow/SKILL.md';
try {
  const stats = fs.statSync(path);
  console.log('File exists:', path);
  console.log('Size:', stats.size);
  const content = fs.readFileSync(path, 'utf8');
  console.log('Read successful, first line:', content.split('\n')[0]);
} catch (err) {
  console.error('Error accessing file:', err.message);
}
