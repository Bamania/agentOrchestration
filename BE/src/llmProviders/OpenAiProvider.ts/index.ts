import llmProvider from "../lllmProvider.js";
import OpenAI from "openai";
import type { AgentInput, AgentResponse, LLMInput } from "../../globalTypes.js";
// import formatToCortexMessage from "../../helper.js";
import {z}  from "zod";
class OpenAiProvider extends llmProvider {

  apiKey: string;
  client: OpenAI;
  // Translate OpenAI's raw response into our provider-agnostic AgentResponse.
  // This is the ONLY place that knows OpenAI's shape - the agent never sees it.
  private formatopenAiResponse(response: any, model_name: string): AgentResponse {
    const choice = response.choices?.[0];
    const message = choice?.message;

    // OpenAI tool_calls look like { id, type, function: { name, arguments } }
    // where `arguments` is a JSON *string*. Normalize into our ToolCall shape,
    // parsing the arguments here so the agent gets a ready-to-use object.
    const tool_calls = message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      tool_name: tc.function.name,
      type: tc.type,
      parameters: JSON.parse(tc.function.arguments || "{}"),
    }));

    return {
      // content is null on a pure tool-call response - that's expected.
      message: message?.content ?? null,
      tool_calls,
      finishReason: choice?.finish_reason,
      tokens: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      modelname: model_name,
    };
  }

  constructor(apiKey: string, model_name: string, client: any) {
    super(model_name);
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }
  async create(
    llmMessage: LLMInput,
   
  ): Promise<AgentResponse> {
    // let input: AgentInput = formatToCortexMessage(userMessage); //later we will develop a fx to format this according to our api msg
    let response:any  ; //this type should be the type of response ai provider gives us
    type outputSchemaType = z.infer<typeof llmMessage.outputSchema>;
    let outputSchema:outputSchemaType;
    if(llmMessage.outputSchema){
      response = await this.client.chat.completions.create({
        model: this.model_name,
        messages: [
          { 
            role: "system",
            content: llmMessage.systemPrompt || "You are a helpful assistant.",
          },
          {
              role: "user",
              // ai helped to fix this type bug !
              content: typeof llmMessage.userMessage === "string" ? llmMessage.userMessage : llmMessage.userMessage.join("\n"),
          }
          ],
          tools:llmMessage.tools,
          // max_tokens:
          // implement the structure output logic
         response_format: { type: "json_schema", json_schema:outputSchema }
        
      });
    }
     response = await this.client.chat.completions.create({
      model: this.model_name,
      messages: [
        { 
          role: "system",
          content: llmMessage.systemPrompt || "You are a helpful assistant.",
        },
        {
            role: "user",
            // ai helped to fix this type bug !
            content: typeof llmMessage.userMessage === "string" ? llmMessage.userMessage : llmMessage.userMessage.join("\n"),
        }
        ],
        tools:llmMessage.tools,
        // max_tokens:
        
    });
    
    return this.formatopenAiResponse(response,this.model_name);
    
  }
  async *create_stream(
   llmMessage: LLMInput,
  ): AsyncGenerator<AgentResponse, void, unknown> {
    // Implement the logic to call OpenAI Api in streaming way
    // const response=await this.client.chat.completions.create({
    // yield FormatToCortexResponse(response)- we will implement these steps ! later
    yield {
      message: "streaming response from openai provider",
      tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      modelname: this.model_name,
    };
  }
}

export default OpenAiProvider;
