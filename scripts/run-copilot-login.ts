#!/usr/bin/env -S node
import { githubCopilotLoginCommand } from "../extensions/github-copilot/login.js";
import { defaultRuntime } from "../src/runtime.js";

(async function(){
  try {
    await githubCopilotLoginCommand({}, defaultRuntime as any);
  } catch (err) {
    console.error('Login failed:', err);
    process.exit(1);
  }
})();
