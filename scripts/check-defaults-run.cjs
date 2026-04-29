#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Quick validator for the defaults constants — avoids running full test suite.
try {
  const file = path.resolve(__dirname, "../src/agents/defaults.ts");
  const src = fs.readFileSync(file, "utf8");

  const providerMatch = src.match(/DEFAULT_PROVIDER\s*=\s*"([^"]+)"/);
  const modelMatch = src.match(/DEFAULT_MODEL\s*=\s*"([^"]+)"/);
  const tokensMatch = src.match(/DEFAULT_CONTEXT_TOKENS\s*=\s*([0-9_]+)/);

  const provider = providerMatch ? providerMatch[1] : null;
  const model = modelMatch ? modelMatch[1] : null;
  const tokens = tokensMatch ? Number(tokensMatch[1].replace(/_/g, "")) : null;

  let ok = true;
  if (provider !== "openrouter") {
    console.error('DEFAULT_PROVIDER mismatch: expected "openrouter", got', provider);
    ok = false;
  }
  if (model !== "deepseek/deepseek-v4-pro") {
    console.error('DEFAULT_MODEL mismatch: expected "deepseek/deepseek-v4-pro", got', model);
    ok = false;
  }
  if (typeof tokens !== "number" || tokens <= 0) {
    console.error("DEFAULT_CONTEXT_TOKENS invalid:", tokens);
    ok = false;
  }

  if (!ok) {
    process.exitCode = 1;
  } else {
    console.log("defaults check passed");
  }
} catch (err) {
  console.error("error running check:", err && err.stack ? err.stack : String(err));
  process.exitCode = 2;
}
