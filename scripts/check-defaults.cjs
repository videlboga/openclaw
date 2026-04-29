#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Lightweight CommonJS checker for src/agents/defaults.ts constants.
// Single-purpose: validate we changed the defaults to openrouter/deepseek.

try {
  const file = path.resolve(__dirname, '../src/agents/defaults.ts');
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');

  function findString(name) {
    const re = new RegExp(name + '\\s*=\\s*"([^\\"]+)"');
    const m = src.match(re);
    return m ? m[1] : null;
  }

  function findNumber(name) {
    const re = new RegExp(name + '\\s*=\\s*([0-9_]+)');
    const m = src.match(re);
    if (!m) return null;
    return Number(m[1].replace(/_/g, ''));
  }

  const provider = findString('DEFAULT_PROVIDER');
  const model = findString('DEFAULT_MODEL');
  const tokens = findNumber('DEFAULT_CONTEXT_TOKENS');

  let ok = true;
  if (provider !== 'openrouter') {
    console.error('DEFAULT_PROVIDER mismatch. Expected "openrouter", got:', provider);
    ok = false;
  }
  if (model !== 'deepseek/deepseek-v4-pro') {
    console.error('DEFAULT_MODEL mismatch. Expected "deepseek/deepseek-v4-pro", got:', model);
    ok = false;
  }
  if (typeof tokens !== 'number' || tokens <= 0) {
    console.error('DEFAULT_CONTEXT_TOKENS invalid. Got:', tokens);
    ok = false;
  }

  if (!ok) process.exitCode = 1;
  else console.log('defaults check passed');
} catch (err) {
  console.error('check-defaults failed:', err && err.stack ? err.stack : String(err));
  process.exitCode = 2;
}
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Lightweight CommonJS checker for src/agents/defaults.ts constants.
// Single-purpose: validate we changed the defaults to openrouter/deepseek.

try {
  const file = path.resolve(__dirname, '../src/agents/defaults.ts');
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');

  function findString(name) {
    const re = new RegExp(name + '\\s*=\\s*"([^\\"]+)"');
    const m = src.match(re);
    return m ? m[1] : null;
  }

  function findNumber(name) {
    const re = new RegExp(name + '\\s*=\\s*([0-9_]+)');
    const m = src.match(re);
    if (!m) return null;
    return Number(m[1].replace(/_/g, ''));
  }

  const provider = findString('DEFAULT_PROVIDER');
  const model = findString('DEFAULT_MODEL');
  const tokens = findNumber('DEFAULT_CONTEXT_TOKENS');

  let ok = true;
  if (provider !== 'openrouter') {
    console.error('DEFAULT_PROVIDER mismatch. Expected "openrouter", got:', provider);
    ok = false;
  }
  if (model !== 'deepseek/deepseek-v4-pro') {
    console.error('DEFAULT_MODEL mismatch. Expected "deepseek/deepseek-v4-pro", got:', model);
    ok = false;
  }
  if (typeof tokens !== 'number' || tokens <= 0) {
    console.error('DEFAULT_CONTEXT_TOKENS invalid. Got:', tokens);
    ok = false;
  }

  if (!ok) process.exitCode = 1;
  else console.log('defaults check passed');
} catch (err) {
  console.error('check-defaults failed:', err && err.stack ? err.stack : String(err));
  process.exitCode = 2;
}
  if (!ok) process.exitCode = 1;
