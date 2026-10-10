import llmProvider from "../lllmProvider.js";
import OpenAI from "openai";
import type { AgentResponse, LLMInput, TokenUsage, HistoryMessage } from "../../globalTypes.js";

class OpenAiProvider extends llmProvider {
  apiKey: string;
  client: OpenAI;

  constructor(apiKey: string, model_name: string) {
    super(model_name);
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  // Translate OpenAI's raw response into our provider-agnostic AgentResponse.
  // This is the ONLY place that knows OpenAI's shape - the agent never sees it.
  //
  // Note the shape of this function now: it RETURNS one of two union members
  // instead of building one object with half its fields null. The branch that
  // used to be implicit ("is tool_calls empty?") is now explicit and the caller
  // cannot forget to handle it.
  private formatopenAiResponse(response: any, model_name: string): AgentResponse {
    const choice = response.choices?.[0];
    const raw = choice?.message;

    const usage: TokenUsage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    // OpenAI tool_calls look like { id, type, function: { name, arguments } }
    // where `arguments` is a JSON *string*. Normalize into our ToolCall shape.
    const tool_calls = raw?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      tool_name: tc.function.name,
      type: tc.type,
      parameters: JSON.parse(tc.function.arguments || "{}"),
    }));

    if (tool_calls?.length) {
      return { kind: "tool_request", tool_calls, usage, model: model_name, finishReason: "tool_calls" };
    }
    return { kind: "final", message: raw?.content ?? "", usage, model: model_name, finishReason: "stop" };
  }

  /**
   * Turn our LLMInput into OpenAI's `messages` array.
   *
   * This is the payoff for keeping `recalled` separate from `messages`:
   * recalled facts are background knowledge and land in a system block, where
   * models weight them as standing truth; the conversation stays as chat turns.
   * A different provider is free to make the opposite choice - that decision
   * belongs HERE, not in the memory layer.
   */
  private buildMessages(input: LLMInput): any[] {
    const messages: any[] = [
      { role: "system", content: input.systemPrompt || "You are a helpful assistant." },
    ];

    if (input.recalled?.length) {
      messages.push({
        role: "system",
        content:
          "Relevant context recalled from earlier:\n" +
          input.recalled.map((m: HistoryMessage) => `- ${m.content}`).join("\n"),
      });
    }

    for (const m of input.messages) {
      if (m.role === "tool") {
        // A real role:"tool" message must immediately follow an assistant message
        // carrying the matching tool_calls payload, which we do not store yet -
        // sending one here would be rejected. Replaying as assistant text keeps
        // the information in context and keeps the request valid.
        messages.push({ role: "assistant", content: `Tool ${m.tool_name ?? "unknown"} returned: ${m.content}` });
      } else {
        messages.push({ role: m.role, content: m.content });
      }
    }
    return messages;
  }

  async create(llmMessage: LLMInput): Promise<AgentResponse> {
    const messages = this.buildMessages(llmMessage);

    // Structured output is a different request shape, so it RETURNS here
    // instead of falling through into the plain call below (that fall-through
    // used to make - and discard - a whole extra API call).
    if (llmMessage.outputSchema) {
      const structured = await this.client.chat.completions.create({
        model: llmMessage.model || this.model_name,
        messages,
        ...(llmMessage.tools ? { tools: llmMessage.tools as any } : {}),
        response_format: { type: "json_schema", json_schema: llmMessage.outputSchema as any },
      });
      return this.formatopenAiResponse(structured, this.model_name);
    }

    const response = await this.client.chat.completions.create({
      model: llmMessage.model || this.model_name,
      messages,
      ...(llmMessage.tools ? { tools: llmMessage.tools as any } : {}),
      ...(llmMessage.maxTokens !== undefined ? { max_tokens: llmMessage.maxTokens } : {}),
      ...(llmMessage.temperature !== undefined ? { temperature: llmMessage.temperature } : {}),
    });

    return this.formatopenAiResponse(response, this.model_name);
  }

  async *create_stream(llmMessage: LLMInput): AsyncGenerator<AgentResponse, void, unknown> {
    // TODO: real streaming - yield partial AgentResponse as chunks arrive
    yield {
      kind: "final",
      message: "streaming response from openai provider",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      model: this.model_name,
    };
  }
}

export default OpenAiProvider;
