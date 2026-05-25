import type { AgentResponse, LLMInput } from "../../globalTypes.js";
import type llmProvider from "../../llmProviders/lllmProvider.js";
import BaseAgent from "../baseAgent.js";

class Agent extends BaseAgent {
  userMessage: string | Array<string>;
  constructor(
    name: string,
    instruction: string,
    tools: Array<any>,
    memory: any,
    model_client: llmProvider,
    context?: string,
    max_iteration?: number,
    userMessage?: string | Array<string>,
  ) {
    super(
      name,
      instruction,
      tools,
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
    /**  we will implement the logic to call the model provider with the user msg and
         memory and context and tools maybe and return the response in the format of AgentResponse 
         {message:string,tokens:{inputTokens:number,outputTokens:number,totalTokens:number},modelname:string}
        **/
    
        // before agent runs it prepares the context 
        const agentInput:LLMInput={
            systemPrompt:this.instruction,
            userMessage:userMessage,
            memory:this.memory,
            tools:this.tools,
            context:this.context,
            cancellationtoken:cancellationToken
        }
        const llmResponse=await this.model_client.create(agentInput);
        
    return {
      message:llmResponse.message,
      tokens: { inputTokens: llmResponse.tokens.inputTokens, outputTokens: llmResponse.tokens.outputTokens, totalTokens: llmResponse.tokens.totalTokens },
      modelname: this.model_client.model_name,
    };
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
