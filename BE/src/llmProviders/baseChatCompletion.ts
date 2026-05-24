import type { AgentResponse } from "./globalTypes.js";

 abstract class BaseChatCompletion {
    model_client:string;

    constructor(model_client:string){
        this.model_client=model_client;
    }

    abstract  create(userMessage:string | Array<string>,cancellationToken?:any):Promise<AgentResponse>
    abstract  create_stream(userMessage:string | Array<string>,cancellationToken?:any):AsyncGenerator<any,void,unknown>

}

export default BaseChatCompletion;
