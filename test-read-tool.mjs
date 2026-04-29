import fs from 'node:fs';
import path from 'node:path';

function read(filePath) {
  // Simulate the read tool's path resolution
  let resolved = filePath;
  if (filePath.startsWith('~/')) {
    resolved = path.join(path.resolve(process.env.HOME || ''), filePath.slice(2));
  } else if (!path.isAbsolute(filePath)) {
    resolved = path.resolve(filePath);
  }
  
  console.log('Original path:', filePath);
  console.log('Resolved path:', resolved);
  
  try {
    const content = fs.readFileSync(resolved, 'utf8');
    console.log('Successfully read', content.length, 'bytes');
    console.log('First 50 chars:', content.substring(0, 50).replace(/\n/g, '\\n'));
  } catch (err) {
    console.error('FAILED to read:', err.message);
  }
}

console.log('Testing relative path from root:');
read('skills/taskflow/SKILL.md');

console.log('\nTesting absolute path:');
read('/home/cyberkitty/Projects/openclaw/skills/taskflow/SKILL.md');

console.log('\nTesting home path:');
read('~/Projects/openclaw/skills/taskflow/SKILL.md');
