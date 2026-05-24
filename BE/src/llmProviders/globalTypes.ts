export interface AgentResponse {
    message:string;
    tokens:{
        inputTokens:number;
        outputTokens:number;
        totalTokens:number;
    }
    modelname:string;
}