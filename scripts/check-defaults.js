#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/agents/defaults.ts');
const src = fs.readFileSync(file, 'utf8');

function findString(name) {
  const re = new RegExp(`${name}\s*=\s*["']([^"']+)["']`);
  const m = src.match(re);
  return m ? m[1] : null;
}

function findNumber(name) {
  const re = new RegExp(`${name}\s*=\s*([0-9_]+)`);
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

if (!ok) process.exit(1);
console.log('defaults check passed');
process.exit(0);
