const fs = require('fs');
const target = '/home/cyberkitty/Projects/openclaw/skills/taskflow/SKILL.md';
try {
  const lstats = fs.lstatSync(target);
  console.log('Is symlink:', lstats.isSymbolicLink());
  if (lstats.isSymbolicLink()) {
    console.log('Symlink points to:', fs.readlinkSync(target));
  }
} catch (err) {
  console.error('Error:', err.message);
}
