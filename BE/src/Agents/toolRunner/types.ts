
// A single tool invocation requested by the model, normalized across providers.
export interface ToolCall{
    id:string;                        // provider's call id - must be echoed back with the result
    tool_name:string;                 // which tool to run
    type?:string;                     // e.g. "function"
    parameters:Record<string,any>;    // already JSON-parsed into an object-. params:{"city":"paris"}
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

// export interface AgentasToolDefinition {
//     type:"Agent_tool_function";
//     function:{
//         name:string;
//         description?:string;
//         parameters?:string;  //agent response which is a string only !
//     }
// }

// A single executable tool (Strategy). Adding a tool = implementing this.
export interface ITool{
    tool_name:string; //agent Name
    schema:ToolDefinition ; //params//user query
    execute(args:Record<string,any>):Promise<any>; //agent.run(userQUery)
}

// The collaborator the agent depends on to run tools (injected, like llmProvider).
export interface IToolRunner{
    execute(calls:ToolCall[]):Promise<ToolResult[]>;
    getDefinitions():ToolDefinition[];
    
}

export interface IMiddlewareChain {
    execute_stream(middlewares:Array<any>):AsyncGenerator<void>
}

// const userquery="hi"
// schema={
//     "wheather_agent":new WheatherAgent()
//     "time_agent":new timeagent()
// }
// const result=nlpClassifier(userquery,schema)

/*
{
result=wheather_agent
}
*/


// if (result=="wheather_agent"){
//     const agent=new Agent("userquery")
//     const response=agent.run((userquery))
//     return response
// }
//sendToLlm(userquery)