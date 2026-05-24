// Todo-1,create a model provider and agents class from our MAIN AGENT SDK(cortex) and export it here, so that we can use it in our API routes and services

import type { AgentResponse } from "../llmProviders/globalTypes.js";


abstract class BaseAgent {
  name: string;
  tools: Array<any>; // [websearchtool,tool2 etc]
  memory: any; //need to figure out the type of memoy
  context:string;
  max_iteration:number=10;
  instruction:string;
  model_client:string;
  cancellationToken:any; //probably using false/true?!

  constructor(name: string, instruction:string,tools: Array<any>, memory: any,model_client:string,context?:string,max_iteration?:number) {
    this.name = name;
    this.instruction = instruction;
    this.tools = tools;
    this.memory = memory;
    this.context=context || "";
    this.model_client=model_client;
    this.max_iteration=max_iteration || 10;
  }

//Any agent generally has two main fx ,run and run_stream
 
// run will just make the llm call witht the user msg and memory and context maybe?!
abstract run(userMessage:string | Array<string>,cancellationToken?:any):Promise<AgentResponse>
                                                                  /**yeildType,return type,sendtype**/              
abstract run_stream(userMessage:string | Array<string>,cancellationToken?:any):AsyncGenerator<AgentResponse,void,unknown>
}

export default BaseAgent;