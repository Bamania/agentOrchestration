// Todo-1,create a model provider and agents class from our MAIN AGENT SDK(cortex) and export it here, so that we can use it in our API routes and services

import type { AgentResponse } from "../globalTypes.js";
import type { IToolRunner } from "./toolRunner/types.js";
import type llmProvider from "../llmProviders/lllmProvider.js";


abstract class BaseAgent {
  name: string;
  toolRunner: IToolRunner; // injected collaborator that owns tool schemas + execution
  memory: any; //need to figure out the type of memoy
  context:string;
  max_iteration:number=10;
  instruction:string;
  model_client:llmProvider; //this is the wrapper that will wrap every provider we have!
  cancellationToken:any; //probably using false/true?!

  constructor(name: string, instruction:string,toolRunner: IToolRunner, memory: any,model_client:llmProvider,context?:string,max_iteration?:number) {
    this.name = name;
    this.instruction = instruction;
    this.toolRunner = toolRunner;
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