import type {
  AgentContext,
  AgentEvent,
  AgentInput,
  AgentResponse,
  LLMInput,
  MemoryRequest,
} from "../../globalTypes.js";
import BaseAgent, { type AgentConfig } from "../baseAgent.js";

// No node globals available (tsconfig types are restricted), so ids are built
// from primitives that always exist.
let runCounter = 0;
function newRunId(): string {
  runCounter += 1;
  return `run-${Date.now().toString(36)}-${runCounter.toString(36)}`;
}

/**
 * agent msg => ConversationalHistory + userMessage + Memory + systemPrompt + tools
 *
 * That addition IS the "LLM Input enrichment" step: a thin AgentInput goes in,
 * a fat LLMInput comes out. Everything the agent adds, it gets from memory and
 * the tool runner - which is why both are injected rather than built here.
 */
class Agent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  /** Scope for every memory call in this run - WHO this is for, WHERE it applies. */
  private scopeFor(input: AgentInput): MemoryRequest {
    return {
      scope: this.defaultMemoryScope,
      chatId: input.chatId,
      agentId: this.name,
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
    };
  }

  private buildContext(input: AgentInput): AgentContext {
    return {
      runId: newRunId(),
      chatId: input.chatId,
      agentId: this.name,
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      iteration: 0,
      state: input.state ?? {},
    };
  }

  async run(input: AgentInput): Promise<AgentResponse> {
    // The agentic loop: call the model, and if it asks for tools, run them,
    // feed the results back, and call again - bounded by max_iteration so a
    // model that keeps asking for tools can never loop forever.
    const text = Array.isArray(input.message) ? input.message.join("\n") : input.message;
    const ctx = this.buildContext(input);
    const req = this.scopeFor(input);

    // Record the user's turn BEFORE enriching, so what memory hands back is the
    // complete conversation including this turn.
    await this.memory.add(req, { role: "user", content: text });

    for (let iteration = 0; iteration < this.max_iteration; iteration++) {
      ctx.iteration = iteration;

      
      // chat-scoped history (what was said) and agent-scoped recall (what this
      // agent knows across chats) are fetched separately and kept separate, so
      // the provider decides how each is best expressed.
      const messages = await this.memory.get_context({ ...req, query: text });
      const recalled = await this.memory.query({ ...req, scope: "agent", query: text });

      const llmInput: LLMInput = {
        model: this.model_id,
        systemPrompt: this.instruction,
        messages,
        recalled,
        tools: this.toolRunner.getDefinitions(),
        stream: this.stream,
        ...(this.outputSchema !== undefined ? { outputSchema: this.outputSchema } : {}),
      };

      const response = await this.model_client.create(llmInput);

      // The union pays off here: no `?.length`, no "did it return both?" guard.
      // Each branch is exhaustive and the compiler checks it.
      if (response.kind === "final") {
        await this.memory.add(req, { role: "assistant", content: response.message });
        return response;
      }

      if (response.kind === "blocked") {
        return response; // a middleware refused - the model was never called
      }

      // Narrowed to kind === "tool_request": tool_calls is guaranteed present.
      const toolResults = await this.toolRunner.execute(response.tool_calls);

      // Tool results go into MEMORY, not a concatenated string that dies when
      // run() returns - this is the `Tools_output/chat-Id (memory -> tx)` arrow.
      for (const r of toolResults) {
        await this.memory.add(req, {
          role: "tool",
          content: JSON.stringify(r.output),
          tool_call_id: r.tool_call_id,
          tool_name: r.tool_name,
        });
      }
    }

    throw new Error(
      `Simple Agent "${this.name}" reached max_iteration (${this.max_iteration}) without a final response ,Please try again !`,
    );
  }

  async *run_stream(input: AgentInput): AsyncGenerator<AgentEvent, AgentResponse, unknown> {
    const ctx = this.buildContext(input);
    yield { type: "run_started", runId: ctx.runId, chatId: ctx.chatId };

    // TODO: real streaming - drive model_client.create_stream and yield
    // llm_token / tool_started / tool_completed events as they happen.
    const response = await this.run(input);

    yield { type: "run_completed", runId: ctx.runId, usage: response.usage };
    return response;
  }
}

export default Agent;
