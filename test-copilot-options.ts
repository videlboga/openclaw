import { agentCommandFromIngress } from "./src/agents/agent-command.js";
import { defaultRuntime } from "./src/runtime.js";
import { createDefaultDeps } from "./src/cli/deps.js";

async function probeTest(allowOverride: boolean, useModelOpt: boolean) {
  const deps = createDefaultDeps();
  const opts: any = {
    message: "ping test",
    images: [],
    clientTools: [],
    sessionKey: ,
    runId: ,
    messageChannel: "probe",
    senderIsOwner: true,
    agentId: "main",
    deliver: false,
    streamParams: { maxTokens: 128 },
    allowModelOverride: allowOverride,
  };
  if (useModelOpt) {
    opts.model = "github-copilot/gpt-5-mini";
  }

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await agentCommandFromIngress({ ...opts, abortSignal: controller.signal }, defaultRuntime, deps as any);
    clearTimeout(to);
    const payloads = (res as any)?.payloads ?? [];
    const text = payloads.find((p: any) => typeof p.text === "string")?.text ?? "(no text)";
    console.log(, text.slice(0, 120).replace(/\n/g, ' '));
  } catch (err: any) {
    clearTimeout(to);
    console.log(, err.message);
  }
}

async function run() {
  await probeTest(false, false);
  await probeTest(true, true);
  await probeTest(true, false);
  await probeTest(false, false);
}
run().catch(console.error);
