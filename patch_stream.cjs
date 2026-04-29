const fs = require('fs');
const file = 'src/agents/openai-transport-stream.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/let params = build/g, 'let paramsToLog: any;\n        let params = build');
code = code.replace(/const responseStream =/g, 'paramsToLog = params;\n        const responseStream =');
code = code.replace(/catch \(error\) \{/g, 'catch (error) {\n        console.error("RAW_PARAMS_ON_ERROR:", JSON.stringify(paramsToLog || {}, null, 2));');

fs.writeFileSync(file, code);
