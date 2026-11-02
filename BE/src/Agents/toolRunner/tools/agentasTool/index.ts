import type BaseAgent from "../../../baseAgent.js";
import type{ ITool } from "../../types.js";

let callCounter=0; // makes each delegation's chatId unique

class AgentAsTool {
    agentTool:ITool

    constructor(agent:BaseAgent){
        this.agentTool={
            tool_name:agent.name,
            schema:{
                type:"function",
                function:{
                    name:agent.name,
                    description:agent.description, // short "when to use me" text, not the system prompt
                    parameters:{
                        type:"object",
                        properties:{prompt:{type:"string",description:"The input or query parent agent passed in this agent "}},
                        required:["prompt"] // without this the model may call the tool with no arguments
                    }
                }
            },
            execute:async function (args){

                   // `args` IS the parameters object the model sent ({prompt: "..."}) - not the whole ToolCall
                   // a new chat per call, so one delegated task never sees another task's history
                   callCounter+=1;
                   const response=await agent.run({
                    message:args.prompt,
                    // @UPDATE- here we need to ensure the chat id is unique ! this will be done later.
                    chatId:`${agent.name}-${Date.now().toString(36)}-${callCounter.toString(36)}`
                   })
                    //now again i dont need to retunr the agent respones
                    //i need to return the Tool Response !

                  // Just return the output. ToolRunner.execute wraps whatever we return into
                  // { tool_call_id, tool_name, output } itself - it owns the id and the name.
                  // Only the "final" kind has a `message`, so that is the key that goes into result.output.
                  if(response.kind==="final"){
                      return response.message;
                  }
                  // blocked / tool_request: no answer to hand back, so tell the parent model why
                  return response.kind==="blocked"
                      ? `${agent.name} refused the task: ${response.reason}`
                      : `${agent.name} did not produce an answer.`;
            }
        }
    }
}

export { AgentAsTool };
