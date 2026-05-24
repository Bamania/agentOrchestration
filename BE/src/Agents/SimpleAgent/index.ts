import type { AgentResponse } from "../../llmProviders/globalTypes.js";
import BaseAgent from "../baseAgent.js";

class Agent extends BaseAgent {
   userMessage:string | Array<string>;  
    constructor(name: string, instruction:string,tools: Array<any>, memory: any,model_client:string,context?:string,max_iteration?:number,userMessage?:string | Array<string>) {
        super(name, instruction,tools, memory,model_client,context,max_iteration);
        this.userMessage = userMessage || "No user message given at the time of agent creation";
    }
    // prepare the context for any Agent-systemPrompt,userQuery,and history
    

    async run(userMessage: string | Array<string>, cancellationToken?: any):Promise<AgentResponse> {
        // we will implement the logic to call the model provider with the user msg and memory and context and tools maybe and return the response in the format of AgentResponse {message:string,tokens:{inputTokens:number,outputTokens:number,totalTokens:number},modelname:string}
        return {message:"response from agent run method", tokens:{inputTokens:0, outputTokens:0, totalTokens:0}, modelname:this.model_client};
    }
    async *run_stream(userMessage: string | Array<string>, cancellationToken?: any): AsyncGenerator<AgentResponse, void, unknown> {
        // Implement the logic to call the model provider in streaming way and yield the response in the format of AgentResponse {message:string,tokens:{inputTokens:number,outputTokens:number,totalTokens:number},modelname:string}
        yield {message:"streaming response from agent run_stream method", tokens:{inputTokens:0, outputTokens:0, totalTokens:0}, modelname:this.model_client};
    }
}