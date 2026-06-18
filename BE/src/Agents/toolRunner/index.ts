import type {
  ITool,
  IToolRunner,
  ToolCall,
  ToolDefinition,
  ToolResult,
} from "./types.js";

/**
 * Executes the tools the model asks for.
 *
 * Built from a registry (Map of tool_name -> tool) instead of a switch, so
 * adding a new tool means registering an ITool - never editing this class or
 * the agent loop (this following the OCP).
 */
class ToolRunner implements IToolRunner {
  private registry = new Map<string, ITool>();

  constructor(tools: ITool[] = []) {
    for (const tool of tools) this.register(tool);
  }

  register(tool: ITool): void {
    this.registry.set(tool.tool_name, tool);
  }

  // The schemas handed to the LLM so it knows which tools exist.
  getDefinitions(): ToolDefinition[] {
    return [...this.registry.values()].map((tool) => tool.schema);
  }

  // The model can request several tools at once (parallel tool calls),
  // so we run them all and keep each call's id for the response.
  async execute(calls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(
      calls.map(async (call) => {
        const tool = this.registry.get(call.tool_name);
        if (!tool) throw new Error(`Tool not registered: ${call.tool_name}`);
        const output = await tool.execute(call.parameters);
        return {
          tool_call_id: call.id,
          tool_name: call.tool_name,
          output,
        };
      }),
    );
  }
}

export default ToolRunner;
