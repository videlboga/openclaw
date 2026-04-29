import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";

const AgentConfigSchema = Type.Object({
  id: Type.String({ description: "Agent ID (e.g. planner, coder, reviewer)" }),
  model: Type.String({ description: "Model name to use (e.g. anthropic/claude-3.5-sonnet)" }),
  systemPrompt: Type.String({ description: "The system instructions/role for the agent" }),
  order: Type.Number({ description: "Execution order (0, 1, 2, ...)" })
});

const PipelineExecuteToolSchema = Type.Object({
  pipelineId: Type.String({ description: "A unique identifier for this pipeline run" }),
  workspaceDir: Type.String({ description: "Absolute path to workspace directory where agents will run" }),
  agents: Type.Array(AgentConfigSchema, { description: "Ordered list of agents inside the pipeline" }),
  initialMessage: Type.String({ description: "The starting prompt or context message for the first agent" })
});

export function createPipelineExecuteTool(): AnyAgentTool {
  return {
    label: "Pipeline Execute",
    name: "pipeline_execute",
    description: "Launch a background pipeline orchestrator that coordinates multiple agents in sequence. Pass the full JSON structure defining your sub-agents.",
    parameters: PipelineExecuteToolSchema,
    execute: async (args: any) => {
      const configPath = path.join(os.tmpdir(), `pipeline-config-${args.pipelineId}-${Date.now()}.json`);
      await fs.writeFile(configPath, JSON.stringify(args, null, 2), "utf8");

      // Spawning the orchestrator script in the background
      const cp = spawn("npx", ["tsx", "src/agents/pipeline-orchestrator.ts", configPath], {
        detached: true,
        stdio: "ignore",
        cwd: process.cwd() // Assumes openclaw root
      });
      
      cp.unref();

      return jsonResult({
        status: "Pipeline orchestration started in background.",
        pipelineId: args.pipelineId,
        configPath: configPath,
        pid: cp.pid
      });
    },
  };
}
