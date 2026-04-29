import { spawn } from "child_process";
import fs from "fs/promises";

export interface AgentPipelineConfig {
  pipelineId: string;
  workspaceDir: string;
  agents: Array<{
    id: string;
    model: string;
    systemPrompt: string;
    order: number;
  }>;
  initialMessage: string;
}

async function runOpenClawCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const cp = spawn("node", ["openclaw.mjs", ...args], { stdio: "inherit" });
    cp.on("close", (code) => {
      if (code === 0) {resolve();}
      else {reject(new Error(`Command failed: openclaw.mjs ${args.join(" ")}`));}
    });
  });
}

async function executeAgentTurn(agentId: string, message: string, onChunk: (text: string) => void): Promise<{finalText: string}> {
  return new Promise((resolve, reject) => {
    let output = "";
    // We use --json to be able to parse if needed, but we'll capture stdout
    const cp = spawn("node", ["openclaw.mjs", "agent", "--agent", agentId, "--message", message, "--json", "--verbose", "on"]);
    
    cp.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      onChunk(text);
    });
    
    cp.stderr.on("data", (data) => {
      // also capture stderr just in case or log to console
      process.stderr.write(data);
    });

    cp.on("close", (code) => {
      if (code !== 0) {
        console.error(`Agent ${agentId} failed with code ${code}`);
      }
      resolve({ finalText: output });
    });
  });
}

async function main() {
  const configFile = process.argv[2];
  if (!configFile) {
    console.error("Usage: tsx pipeline-orchestrator.ts <config-file.json>");
    process.exit(1);
  }

  const raw = await fs.readFile(configFile, "utf8");
  const config: AgentPipelineConfig = JSON.parse(raw);

  const emit = (event: any) => {
    // Write special markers so the caller (proxy) can perfectly parse the stream
    console.log(`\n---PIPELINE_EVENT---\n${JSON.stringify(event)}\n---END_EVENT---\n`);
  };

  emit({ type: "pipeline_start", pipelineId: config.pipelineId });

  // 1. Setup agents
  const sortedAgents = [...config.agents].toSorted((a, b) => a.order - b.order);
  
  for (const agent of sortedAgents) {
    const fullAgentId = `${config.pipelineId}-${agent.id}`;
    emit({ type: "agent_setup", agentId: agent.id, state: "creating" });
    
    try {
      await runOpenClawCommand([
        "agents", "add", fullAgentId,
        "--model", agent.model,
        "--workspace", config.workspaceDir,
        "--non-interactive"
      ]);
    } catch (e: any) {
      console.error(`Skipping agent creation (might already exist):`, e.message);
    }
    
    emit({ type: "agent_setup", agentId: agent.id, state: "ready" });
  }

  // 2. Run pipeline
  let previousContext = config.initialMessage || "";

  for (const agent of sortedAgents) {
    const fullAgentId = `${config.pipelineId}-${agent.id}`;
    emit({ type: "agent_start", agentId: agent.id, fullAgentId });

    const runMessage = `ВНИМАНИЕ: СЛЕДУЙ ЭТОЙ РОЛИ И ИНСТРУКЦИИ:\n\n${agent.systemPrompt}\n\n${
      previousContext
        ? `Контекст от предыдущего шага:\n\n${previousContext}\n\nВыполни свою часть задачи согласно твоей роли.`
        : "Изучи файлы в директории и выполни свою часть задачи."
    }`;

    const result = await executeAgentTurn(fullAgentId, runMessage, (chunk) => {
      emit({ type: "agent_stream", agentId: agent.id, chunk });
    });

    previousContext = result.finalText;
    emit({ type: "agent_done", agentId: agent.id });
  }

  emit({ type: "pipeline_done", pipelineId: config.pipelineId, finalOutput: previousContext });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
