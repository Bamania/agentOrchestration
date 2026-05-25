import type { AgentResponse, LLMInput } from "../globalTypes.js";

 abstract class llmProvider
  {
    model_name:string;

    constructor(model_name:string){
        this.model_name=model_name;
    }

    abstract  create(llmMessage: LLMInput):Promise<AgentResponse>
    abstract  create_stream(llmMessage: LLMInput, cancellationToken?:any):AsyncGenerator<any,void,unknown>

}

export default llmProvider
;
