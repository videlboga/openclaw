const fs = require('fs');
const file = 'src/agents/openai-transport-stream.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/try \{/g, 'let paramsToLog: any;\n      try {');
code = code.replace(/let params = build/g, 'paramsToLog = build');
code = code.replace(/params = merge/g, 'paramsToLog = paramsToLog'); // No wait, let's just make everything use paramsToLog!
// Instead...
fs.writeFileSync(file, code);
