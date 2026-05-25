import llmProvider from "../lllmProvider.js";
import OpenAI from "openai";
import type { AgentInput, AgentResponse, LLMInput } from "../../globalTypes.js";
import formatToCortexMessage from "../../helper.js";
class OpenAiProvider extends llmProvider {
  apiKey: string;
  client: OpenAI;

  constructor(apiKey: string, model_name: string, client: any) {
    super(model_name);
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }
  async create(
    llmMessage: LLMInput
  ): Promise<AgentResponse> {
    // let input: AgentInput = formatToCortexMessage(userMessage); //later we will develop a fx to format this according to our api msg

    const response = await this.client.chat.completions.create({
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
    return {
      message: response.choices[0]?.message.content!,
      tokens: {
        inputTokens: response.usage?.prompt_tokens!,
        outputTokens: response.usage?.completion_tokens!,
        totalTokens: response.usage?.total_tokens!,
      },
      modelname: this.model_name,
    };
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
