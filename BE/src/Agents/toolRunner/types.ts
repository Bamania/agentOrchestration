
// A single tool invocation requested by the model, normalized across providers.
export interface ToolCall{
    id:string;                        // provider's call id - must be echoed back with the result
    tool_name:string;                 // which tool to run
    type?:string;                     // e.g. "function"
    parameters:Record<string,any>;    // already JSON-parsed into an object
}

// The result of executing one ToolCall, ready to feed back to the model.
export interface ToolResult{
    tool_call_id:string;              // matches ToolCall.id
    tool_name:string;
    output:any;
}

// The schema we hand to the LLM so it knows a tool exists (OpenAI "function" shape).
export interface ToolDefinition{
    type:"function";
    function:{
        name:string;
        description?:string;
        parameters?:Record<string,any>;
    };
}

// A single executable tool (Strategy). Adding a tool = implementing this.
export interface ITool{
    tool_name:string;
    schema:ToolDefinition;
    execute(args:Record<string,any>):Promise<any>;
}

// The collaborator the agent depends on to run tools (injected, like llmProvider).
export interface IToolRunner{
    execute(calls:ToolCall[]):Promise<ToolResult[]>;
    getDefinitions():ToolDefinition[];
}
