import fs from 'fs';
let code = fs.readFileSync('src/agents/openai-transport-stream.ts', 'utf-8');
code = code.replace(/try \{/g, 'let _paramsToLog: any;\n      try {');
code = code.replace(/let params = build/g, '_paramsToLog = params = build');
code = code.replace(/params = nextParams/g, 'params = nextParams; _paramsToLog = params');
code = code.replace(/params = mergeTransportMetadata/g, 'params = mergeTransportMetadata(params, turnState?.metadata); _paramsToLog = params;');
code = code.replace(/catch \(error\) \{/g, 'catch (error) {\n        console.error("RAW_PARAMS_ON_ERROR:", JSON.stringify(_paramsToLog || {}, null, 2));');
// wait, the mergeTransportMetadata replacement shouldn't duplicate the signature.
fs.writeFileSync('src/agents/openai-transport-stream.ts', code);
