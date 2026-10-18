import llmProvider from "../lllmProvider.js";
import { GoogleGenAI, FinishReason as GeminiFinishReason } from "@google/genai";
import type { Content, GenerateContentConfig, GenerateContentResponse } from "@google/genai";
import type { AgentResponse, FinishReason, LLMInput, TokenUsage, HistoryMessage } from "../../globalTypes.js";
import type { ToolCall } from "../../Agents/toolRunner/types.js";

class GeminiProvider extends llmProvider {
  apiKey: string;
  client: GoogleGenAI;

  constructor(apiKey: string, model_name: string) {
    super(model_name);
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  // Translate Gemini's raw response into our provider-agnostic AgentResponse.
  // Same contract as OpenAiProvider.formatopenAiResponse - the agent cannot
  // tell which provider answered, which is the whole point of the abstraction.
  private formatGeminiResponse(response: GenerateContentResponse, model_name: string): AgentResponse {
    const usage: TokenUsage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    // Gemini function calls look like { id?, name, args } where `args` is
    // already an OBJECT (OpenAI sends a JSON string). Gemini may omit the id,
    // but our ToolCall needs one to tie the result back - so we mint one.
    const tool_calls: ToolCall[] | undefined = response.functionCalls?.map((fc, i) => ({
      id: fc.id ?? `${fc.name ?? "call"}-${Date.now().toString(36)}-${i}`,
      tool_name: fc.name ?? "",
      type: "function",
      parameters: fc.args ?? {},
    }));

    if (tool_calls?.length) {
      return { kind: "tool_request", tool_calls, usage, model: model_name, finishReason: "tool_calls" };
    }

    // .text is only read once we know there are no function calls - on a
    // mixed response the SDK warns about the non-text parts it skipped.
    const finishReason = this.mapFinishReason(response.candidates?.[0]?.finishReason);
    return { kind: "final", message: response.text ?? "", usage, model: model_name, finishReason };
  }

  // Gemini has ~20 finish reasons; collapse them onto our 6.
  private mapFinishReason(reason: GeminiFinishReason | undefined): FinishReason {
    switch (reason) {
      case GeminiFinishReason.MAX_TOKENS:
        return "length";
      case GeminiFinishReason.SAFETY:
      case GeminiFinishReason.RECITATION:
      case GeminiFinishReason.BLOCKLIST:
      case GeminiFinishReason.PROHIBITED_CONTENT:
      case GeminiFinishReason.SPII:
        return "content_filter";
      case GeminiFinishReason.MALFORMED_FUNCTION_CALL:
        return "error";
      default:
        return "stop";
    }
  }

  /**
   * Turn our LLMInput into Gemini's `systemInstruction` + `contents`.
   *
   * Where it differs from OpenAiProvider.buildMessages:
   *  - Gemini has no "system" role inside `contents`; the system prompt, any
   *    system turns from history and the recalled facts all go into ONE
   *    systemInstruction (the same "background knowledge" slot OpenAI gets).
   *  - Gemini's roles are "user" and "model", not "user" and "assistant".
   *  - Consecutive turns with the same role are merged into one Content, since
   *    Gemini expects user/model turns to alternate.
   */
  private buildContents(input: LLMInput): { systemInstruction: string; contents: Content[] } {
    const system: string[] = [input.systemPrompt || "You are a helpful assistant."];

    if (input.recalled?.length) {
      system.push(
        "Relevant context recalled from earlier:\n" +
          input.recalled.map((m: HistoryMessage) => `- ${m.content}`).join("\n"),
      );
    }

    const contents: Content[] = [];
    for (const m of input.messages) {
      if (m.role === "system") {
        system.push(m.content);
        continue;
      }

      // Same trade-off as OpenAiProvider: a real functionResponse part must
      // follow the model's functionCall part, which we do not store yet - so
      // tool output is replayed as model text to keep the request valid.
      const role = m.role === "user" ? "user" : "model";
      const text = m.role === "tool" ? `Tool ${m.tool_name ?? "unknown"} returned: ${m.content}` : m.content;

      const prev = contents.at(-1);
      if (prev?.role === role) {
        prev.parts = [...(prev.parts ?? []), { text }];
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }

    return { systemInstruction: system.join("\n\n"), contents };
  }

  // Our ToolDefinition is the OpenAI "function" shape. Gemini wants
  // functionDeclarations, and parametersJsonSchema takes that same JSON
  // schema unchanged - so the tool runner never needs to know about Gemini.
  private buildConfig(input: LLMInput, systemInstruction: string): GenerateContentConfig {
    return {
      systemInstruction,
      ...(input.tools?.length
        ? {
            tools: [
              {
                functionDeclarations: input.tools.map((t) => ({
                  name: t.function.name,
                  ...(t.function.description !== undefined ? { description: t.function.description } : {}),
                  ...(t.function.parameters !== undefined ? { parametersJsonSchema: t.function.parameters } : {}),
                })),
              },
            ],
          }
        : {}),
      ...(input.maxTokens !== undefined ? { maxOutputTokens: input.maxTokens } : {}),
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      ...(input.signal !== undefined ? { abortSignal: input.signal } : {}),
    };
  }

  async create(llmMessage: LLMInput): Promise<AgentResponse> {
    const { systemInstruction, contents } = this.buildContents(llmMessage);
    const config = this.buildConfig(llmMessage, systemInstruction);

    // Structured output: OpenAI takes a `json_schema` wrapper ({ name, schema }),
    // Gemini takes the bare schema - unwrap it so one outputSchema works for both.
    if (llmMessage.outputSchema) {
      const schema = (llmMessage.outputSchema as { schema?: unknown }).schema ?? llmMessage.outputSchema;
      config.responseMimeType = "application/json";
      config.responseJsonSchema = schema;
    }

    const response = await this.client.models.generateContent({
      model: llmMessage.model || this.model_name,
      contents,
      config,
    });

    return this.formatGeminiResponse(response, this.model_name);
  }

  async *create_stream(llmMessage: LLMInput): AsyncGenerator<AgentResponse, void, unknown> {
    // TODO: real streaming - drive client.models.generateContentStream and
    // yield partial AgentResponse as chunks arrive
    yield {
      kind: "final",
      message: "streaming response from gemini provider",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      model: this.model_name,
    };
  }
}

export default GeminiProvider;
