import { Type } from "@sinclair/typebox";

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

console.log(JSON.stringify(PipelineExecuteToolSchema, null, 2));

