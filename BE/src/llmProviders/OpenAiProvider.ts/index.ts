import BaseChatCompletion from "../baseChatCompletion.js";
import OpenAI from "openai";
import type { AgentResponse } from "../globalTypes.js";
class OpenAiProvider extends BaseChatCompletion {
    apiKey:string;
    client:OpenAI;

    constructor(apiKey:string,model_client:string){
        super(model_client);
        this.apiKey=apiKey;
        this.client=new OpenAI({
            apiKey: this.apiKey
        });
    }
    async create(userMessage: string | Array<string>, cancellationToken?: any): Promise<AgentResponse> {
        
        let prompt:string="testing "  //later we will develop a fx to format this according to our api msg

        const response=await this.client.chat.completions.create({
            model:this.model_client,
            messages:[{
                content:"testing",
                role: 'user',
                name:"test"
            }  ]
        })
            return {message:response.choices[0]?.message.content! , tokens:{inputTokens:response.usage?.prompt_tokens!, outputTokens:response.usage?.completion_tokens!, totalTokens:response.usage?.total_tokens!}  , modelname:this.model_client}
    }
    async *create_stream(userMessage: string | Array<string>, cancellationToken?: any): AsyncGenerator<AgentResponse, void, unknown> {
    // Implement the logic to call OpenAI Api in streaming way
    // const response=await this.client.chat.completions.create({
    // yield FormatToCortexResponse(response)- we will implement these steps ! later
     yield {message:"streaming response from openai provider", tokens:{inputTokens:0, outputTokens:0, totalTokens:0}, modelname:this.model_client};   
    }
}

export default OpenAiProvider;