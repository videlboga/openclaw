const fs = require('fs');
const origFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (init && init.body && typeof init.body === 'string' && input.toString().includes('githubcopilot')) {
    fs.appendFileSync('/tmp/copilot_payload.log', init.body + '\n---\n');
  }
  return origFetch(input, init);
};
