import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const PipelineGeneratorSchema = Type.Object({
  agents: Type.Array(
    Type.Object({
      id: Type.String({ description: "Agent ID (e.g. planner, coder, reviewer)" }),
      model: Type.String({ description: "Model name to use (e.g. anthropic/claude-3.5-sonnet)" }),
      systemPrompt: Type.String({ description: "The system instructions/role for the agent" }),
      order: Type.Number({ description: "Execution order (0, 1, 2, ...)" }),
    }),
    { description: "Ordered list of agents inside the pipeline" },
  ),
  pipelineId: Type.String({ description: "A unique identifier for this pipeline run" }),
  workspaceDir: Type.String({
    description: "Absolute path to workspace directory where agents will run",
  }),
});

export function createPipelineGeneratorTool(): AnyAgentTool {
  return {
    label: "Pipeline Generator",
    name: "pipeline_generator",
    description: "Generate a JSON configuration for a multi-agent pipeline. Outputs a JSON block that the UI parses to display an Execute Pipeline button.",
    parameters: PipelineGeneratorSchema,
    execute: async (_toolCallId: string, args: any) => {
      // The goal here is just to format and output the JSON block so the UI catches it.
      const pipelineData = {
        pipeline: args.agents,
        pipelineId: args.pipelineId,
        workspaceDir: args.workspaceDir,
        initialMessage: "Выполни задачу как описано",
      };

      const markdownBlock = `~~~json\n${JSON.stringify({ pipeline: pipelineData }, null, 2)}\n~~~`;

      return jsonResult({
        // Return text directly to the assistant to say "Output this to the user"
        status: "ok",
        markdownBlock,
        instructions: "Please output the following markdown block directly in your next message to the user so the UI can render the Execute button:\n\n" + markdownBlock,
      });
    },
  };
}