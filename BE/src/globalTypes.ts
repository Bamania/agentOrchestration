import type { ToolCall } from "./Agents/toolRunner/types.js";

export interface AgentResponse {
    // normal text answer (null when the model only returned tool calls)
    message:string | null;
    // present when the model wants tools executed (provider-agnostic, normalized)
    tool_calls?:ToolCall[];
    // why the model stopped: "stop" | "tool_calls" | "length" | "content_filter" ...
    finishReason?:string;
    tokens:{
        inputTokens:number;
        outputTokens:number;
        totalTokens:number;
    }
    modelname:string;
}

export interface AgentInput{
    content:string;
    role:"user" | "assistant" | "system";
    name?:string;
}

export interface LLMInput{
    userMessage:string | Array<string>;
    memory?:any;
    tools?:any;
    systemPrompt?:string;
    context:any;//extra info around the userMessage
    cancellationtoken?:any;
    outputSchema?:any;// 
}