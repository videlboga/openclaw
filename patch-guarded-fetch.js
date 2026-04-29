const fs = require('fs');
const file = 'src/agents/provider-transport-fetch.ts';
let code = fs.readFileSync(file, 'utf8');

const target = /const result = await fetchWithSsrFGuard\(\{\s+url,/m;
const injection = `
    const rb = requestInit?.body ?? init?.body;
    if (typeof rb === 'string' && rb.includes('model')) {
        console.log("PAYLOAD_TO_COPILOT_START");
        console.log(rb);
        console.log("PAYLOAD_TO_COPILOT_END");
    }
    const result = await fetchWithSsrFGuard({
      url,`;

code = code.replace(target, injection);
fs.writeFileSync(file, code);
