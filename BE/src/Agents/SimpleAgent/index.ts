import type { AgentResponse, LLMInput } from "../../globalTypes.js";
import type { IToolRunner } from "../toolRunner/types.js";
import type llmProvider from "../../llmProviders/lllmProvider.js";
import BaseAgent from "../baseAgent.js";
// agent msg=> ConversationalHistory+userMessage+Memory+systemPrompt+tools
class Agent extends BaseAgent {
  userMessage: string | Array<string>;
  constructor(
    name: string,
    instruction: string,
    toolRunner: IToolRunner,
    memory: any,
    model_client: llmProvider,
    context?: string,
    max_iteration?: number,
    userMessage?: string | Array<string>,
  ) {
    super(
      name,
      instruction,
      toolRunner,
      memory,
      model_client,
      context,
      max_iteration,
    );
    this.userMessage =
      userMessage || "No user message given at the time of agent creation";
  }
  // prepare the context for any Agent-systemPrompt,userQuery,and history

  async run(
    userMessage: string | Array<string>,
    cancellationToken?: any,
  ): Promise<AgentResponse> {
    // The agentic loop: call the model, and if it asks for tools, run them,
    // feed the results back, and call again - bounded by max_iteration so a
    // model that keeps asking for tools can never loop forever.
    let context = this.context;

    for (let iteration = 0; iteration < this.max_iteration; iteration++) {
      const agentInput: LLMInput = {
        systemPrompt: this.instruction,
        userMessage: userMessage,
        memory: this.memory,
        tools: this.toolRunner.getDefinitions(),
        context: context,
        cancellationtoken: cancellationToken,
      };

      const response = await this.model_client.create(agentInput);
      // no tool call model gave its final response !
      if (!response.tool_calls?.length) {
        return response;
      }

      // The model requested one or more tools. The runner executes them all
      // (it knows the registry); we never branch on provider here.
      const toolResults = await this.toolRunner.execute(response.tool_calls);

      // Feed the results back as extra context for the next iteration.
      // proper role:"tool" messages keyed by tool_call_id instead of a string.
      for (const r of toolResults) {
        context += `tool ${r.tool_name} result: ${JSON.stringify(r.output)}`;
      }
    }

    throw new Error(
      `Simple Agent "${this.name}" reached max_iteration (${this.max_iteration}) without a final response ,Please try again !`,
    );
  }
  async *run_stream(
    userMessage: string | Array<string>,
    cancellationToken?: any,
  ): AsyncGenerator<AgentResponse, void, unknown> {
    // Implement the logic to call the model provider in streaming way and yield the response in the format of AgentResponse {message:string,tokens:{inputTokens:number,outputTokens:number,totalTokens:number},modelname:string}
    yield {
      message: "streaming response from agent run_stream method",
      tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      modelname: this.model_client.model_name,
    };
  }
}

export default Agent;
