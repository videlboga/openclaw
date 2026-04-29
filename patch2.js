const fs = require('fs');
const file = 'src/agents/provider-transport-fetch.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace('export function buildGuardedModelFetch', 'console.log("LOADED FETCH PATCH"); export function buildGuardedModelFetch');
code = code.replace('return async (input, init) => {', 'return async (input, init) => {\nconsole.log("HELLO FROM FETCH");');
fs.writeFileSync(file, code);
