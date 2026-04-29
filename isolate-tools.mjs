import fs from "fs";
const apiKey = "ce7943efa8e699a75027ec1db813c4b1dd8e74fb1adc96d4";
import { execSync } from "child_process";

// We need the raw schema json
const schemaStr = execSync("./node_modules/.bin/tsx test-schema-dump.ts").toString();
const pipelineTool = {
  type: "function",
  function: {
    name: "pipeline_execute",
    description: "Launch an autonomous AI agent pipeline",
    parameters: JSON.parse(schemaStr)
  }
};

async function testIt() {
  console.log("Fetching...");
  const res = await fetch("http://127.0.0.1:18789/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openclaw/lain-head",
      messages: [{ role: "user", content: "You MUST invoke pipeline_execute tool RIGHT NOW." }],
      tools: [pipelineTool],
      stream: false
    })
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
testIt().catch(console.error);
