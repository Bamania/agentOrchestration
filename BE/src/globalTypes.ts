import type { ToolCall, ToolDefinition } from "./Agents/toolRunner/types.js";

/* ============================================================================
 * 1. IDENTITY & SCOPE
 * Every durable thing in the system is scoped by WHO it belongs to and WHERE
 * it applies. These aliases exist so the intent is readable at call sites -
 * `add(chatId, agentId)` is self-documenting, `add(string, string)` is not.
 * ==========================================================================*/

export type ChatId = string;    // one conversation
export type AgentId = string;   // one agent, lives across many chats
export type UserId = string;    // the human
export type RunId = string;     // one agent.run() invocation
export type MessageId = string;

/* ============================================================================
 * 2. MESSAGES - the universal stored unit
 * `role` is what makes a stored message replayable into a provider request.
 * `chatId` is what stops one conversation leaking into another.
 * `timestamp` is epoch-ms, NOT Date - see the serializability note in 5.
 * ==========================================================================*/

export type Role = "user" | "assistant" | "system" | "tool";

export interface HistoryMessage {
    id: MessageId;
    role: Role;
    content: string;
    timestamp: number;          // epoch ms - survives JSON round-trip
    chatId: ChatId;
    agentId?: AgentId;
    // present only on role:"tool" messages, tying a result to its call
    tool_call_id?: string;
    tool_name?: string;
}

/** What a caller supplies; ids/timestamps/scope are stamped by the memory layer. */
export interface MessageInput {
    role: Role;
    content: string;
    tool_call_id?: string;
    tool_name?: string;
}

/* ============================================================================
 * 3. RESULT - one shape for "did it work?"
 * Answers the @UPDATE note in ListMemory: "whenever a fx executes think of the
 * success and failure msgs ... make an interface that is universal for every
 * function". A discriminated union makes "ok but also has an error" and
 * "failed but also has a value" UNREPRESENTABLE, not merely discouraged.
 * ==========================================================================*/

export type Result<T, E = string> =
    | { ok: true; value: T }
    | { ok: false; error: E };

/* ============================================================================
 * 4. MEMORY
 * Scope is the axis from the whiteboard: a memory is either tied to one chat
 * (history) or to the agent itself (remembered across chats).
 * ==========================================================================*/

export type MemoryScope = "chat" | "agent";

/** The single object every MemoryManager method takes - add / query / get_context. */
export interface MemoryRequest {
    scope: MemoryScope;
    chatId: ChatId;
    agentId?: AgentId;
    userId?: UserId;
    /** The text to match against. Required by query(); ignored by recency-only stores. */
    query?: string;
    /** Max items to return. */
    limit?: number;
}

/* ============================================================================
 * 5. AGENT CONTEXT - transient execution state (NOT memory)
 *
 * Memory is durable content. Context is per-run state for orchestration.
 *
 * !! MUST STAY JSON-SERIALIZABLE !!
 * This is what enables stateless agents: the client pushes ctx, the server
 * stores it in Redis/DB, and ANY server can resume the run. That means no
 * class instances, no functions, no Date, no Map with object keys.
 * ==========================================================================*/

export interface AgentContext {
    runId: RunId;
    chatId: ChatId;
    agentId: AgentId;
    userId?: UserId;
    /** Which pass of the agentic loop we are on (0-based). */
    iteration: number;
    /**
     * Free-form bag for cross-cutting concerns to pass data to each other
     * (auth writes `user`, rate-limit reads it) WITHOUT this interface changing.
     * This is the extensibility valve - keep values JSON-safe.
     */
    state: Record<string, unknown>;
}

/* ============================================================================
 * 6. STAGE 1 - AGENT INITIALIZATION (construction time, once)
 * Replaces the 8 positional constructor params. Named + optional-with-defaults,
 * so `new Agent({name, model_id})` works and the full wiring stays available.
 * ==========================================================================*/

export interface AgentInitialization {
    name: string;
    model_id: string;
    systemInstructions?: string;
    tools?: ToolDefinition[];
    stream?: boolean;
    outputSchema?: unknown;
    maxIterations?: number;
    /** Default scope for this agent's memory reads/writes. */
    defaultMemoryScope?: MemoryScope;
}

/* ============================================================================
 * 7. STAGE 2 - AGENT INPUT (per agent.run() call, one user turn)
 * Deliberately THIN. Everything else is enrichment, which is the agent's job.
 * ==========================================================================*/

export interface AgentInput {
    message: string | string[];
    chatId: ChatId;
    userId?: UserId;
    /** Per-call overrides of the init-time settings. */
    stream?: boolean;
    outputSchema?: unknown;
    /** Caller-supplied starting state, merged into AgentContext.state. */
    state?: Record<string, unknown>;
}

/* ============================================================================
 * 8. STAGE 3 - LLM INPUT (per model call, N times per run)
 * The FAT object - the output of "LLM Input enrichment". The agent builds this
 * by taking AgentInput and adding memory, tools and instructions.
 * This is a BOUNDARY type: it will churn as providers change. That is normal.
 * ==========================================================================*/

export interface LLMInput {
    model: string;
    systemPrompt?: string;
    /** The conversation, oldest -> newest, including the current user turn. */
    messages: HistoryMessage[];
    /** Background facts recalled from memory - kept SEPARATE from `messages` so
     *  each provider can decide whether they belong in a system block or inline. */
    recalled?: HistoryMessage[];
    tools?: ToolDefinition[];
    outputSchema?: unknown;
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
}

/* ============================================================================
 * 9. OUTPUTS
 * AgentResponse is a DISCRIMINATED UNION, not a bag of optionals.
 * The old shape (`message: string|null` + `tool_calls?: []`) allowed four
 * states but only two were legal - "both set" and "neither set" were silently
 * representable. Here they are impossible to construct.
 * ==========================================================================*/

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export type FinishReason =
    | "stop" | "tool_calls" | "length" | "content_filter" | "blocked" | "error";

interface ResponseBase {
    usage: TokenUsage;
    model: string;
    finishReason?: FinishReason;
}

export type AgentResponse =
    /** The model produced a final answer. */
    | (ResponseBase & { kind: "final"; message: string })
    /** The model wants tools run before it can answer. */
    | (ResponseBase & { kind: "tool_request"; tool_calls: ToolCall[] })
    /** A middleware refused the request - the model was never called. */
    | (ResponseBase & { kind: "blocked"; reason: string; blockedBy: string });

/* ============================================================================
 * 10. AGENT EVENTS - the streaming / observability channel
 * Also a discriminated union, so a `switch (event.type)` is exhaustive and the
 * compiler points at every handler when you add a new event kind.
 * ==========================================================================*/

export type AgentEvent =
    | { type: "run_started"; runId: RunId; chatId: ChatId }
    | { type: "llm_call_started"; iteration: number; model: string }
    | { type: "llm_token"; token: string }
    | { type: "llm_call_completed"; iteration: number; usage: TokenUsage }
    | { type: "tool_started"; tool_name: string; tool_call_id: string }
    | { type: "tool_completed"; tool_name: string; tool_call_id: string; output: unknown }
    | { type: "memory_written"; scope: MemoryScope; count: number }
    | { type: "blocked"; reason: string; blockedBy: string }
    | { type: "error"; message: string; recoverable: boolean }
    | { type: "run_completed"; runId: RunId; usage: TokenUsage };

/* ============================================================================
 * 11. MIDDLEWARE CONTEXT
 * Note it NESTS LLMInput rather than re-listing its fields - two parallel
 * copies of the same fields would drift the first time one side changed.
 * ==========================================================================*/

/**
 * WHICH operation this middleware invocation is wrapping.
 *
 * An agent has more than one interception point, and they are not the same:
 *   agent_run  - once per user turn        (auth, overall timeout, request logging)
 *   model_call - once per loop iteration   (retry on 429, token accounting, caching)
 *   tool_call  - once per tool execution   (tool permissions, sandboxing, truncation)
 *
 * Without this field a middleware cannot tell whether "response" means the final
 * answer or the result of iteration 4 - so a token counter and a "log the final
 * answer" middleware would look identical and behave differently.
 */
export type MiddlewareOperation =
    | "agent_run"
    | "model_call"
    | "tool_call"
    | "memory_access";

export interface MiddlewareContext {
    /** e.g. "model_call" - which interception point we are at. */
    operation: MiddlewareOperation;
    agentContext: AgentContext;
    agentInput:AgentInput
    /** The outbound request. Middleware may mutate this before the model call. */
    request: LLMInput;
    /** Populated only AFTER the wrapped call - undefined in the request phase.
     *  unknown, not AgentResponse: a tool_call returns tool output, not a model response. */
    response?: unknown;
    /** Populated only when something threw. */
    error?: Error;
    metadata:any
}
