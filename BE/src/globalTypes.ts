export interface AgentResponse {
    message:string;
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
}