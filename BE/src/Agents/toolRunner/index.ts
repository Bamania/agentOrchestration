import { string } from "zod";
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

//@UPDATE-make the execute fx back to like this ,it felt implementation heavy so i changed it to much simpler version 

//     async execute(calls: ToolCall[]): Promise<ToolResult[]> {
//   return Promise.all(
//     calls.map(async (call) => {
//       const tool = this.registry.get(call.tool_name);

//       if (!tool) {
//         return { tool_call_id: call.id, tool_name: call.tool_name,
//                  output: `tool ${call.tool_name} was not registered in the tool Registry !` };
//       }

//       const output = await tool.execute(call.parameters ?? {});
//       return { tool_call_id: call.id, tool_name: call.tool_name, output };
//     }),
//   );
// }



    //calls[0]=one tool Call info and we need to execute that tool
    const toolPromises=[];
    const toolResult:ToolResult[]=[];
   
    //get the tool from the registry for each toolcall in the calls:
    for(let item of calls){
      let tool=this.registry.get(item?.tool_name!)
      if(!tool){
        toolPromises.push(new Promise((res,rej)=>{
          res(`tool ${item.tool_name} was not registered in the tool Registry !`)
        }))
      }else {

        //we got the tool model called !
        let toolParams=item?.parameters //param model sent for the too;
        //now call tool with this toolparams!
        //  if(toolParams){  //ADDING IF HERE COULD INTRODUCE A BUG since i am mapping the toolPromises one on one with the output in the second loop
        const result= tool?.execute(toolParams ?? {}) //passing empty object !
        //result holds promise
        
        toolPromises.push(result);
      }
     

    }
      // tool_call_id:string;              // matches ToolCall.id
    // tool_name:string;
    // output:any;
    const output:Promise<any>[]=await Promise.all(toolPromises)
    //[o1,o2,o3,o4]
    for(let i in calls){
      const id=calls[i]?.id
      const name=calls[i]?.tool_name
      const result=output[i];
      toolResult.push({
        tool_call_id:id!,
        tool_name:name!,
        output:result
      })
    }
    return toolResult;
   
  }
}

export default ToolRunner;
