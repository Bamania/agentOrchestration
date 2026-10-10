import type {
  AgentEvent,
  AgentInitialization,
  AgentInput,
  AgentResponse,
  MemoryScope,
} from "../globalTypes.js";
import type { IToolRunner } from "./toolRunner/types.js";
import type llmProvider from "../llmProviders/lllmProvider.js";
import type MemoryManager from "./Memory-1/index.js";
import type BaseMiddleware from "./middleware/index.js";
import { MiddlewareChain } from "./middleware/middlewareChain/index.js";
import { getAutoMiddlewares } from "../autoinstrumentation/index.js";

/**
 * Everything needed to construct an agent.
 *
 * AgentInitialization (in globalTypes) holds the plain settings; the three
 * collaborators are added here because globalTypes stays free of class imports.
 * One named object replaces the old 8 positional params - no more
 * `new Agent("bot", "...", runner, mem, client, undefined, 5)`.
 */
export interface AgentConfig extends AgentInitialization {
  toolRunner: IToolRunner;
  memory: MemoryManager;
  model_client: llmProvider;
  /** Runs in array order on requests, reverse order on responses. */
  middlewares?: BaseMiddleware[]; //each middleware will follow this BaseMiddleware class
}

abstract class BaseAgent {
  name: string;
  model_id: string;
  instruction: string;
  toolRunner: IToolRunner;   // owns tool schemas + execution
  memory: MemoryManager;     // the live memory layer (Memory-1)
  model_client: llmProvider; // wraps whichever provider we're on
  max_iteration: number;
  stream: boolean;
  outputSchema: unknown;
  middlewareChain: MiddlewareChain; // every model/tool call is routed through this MC xD
  defaultMemoryScope: MemoryScope;

  constructor(config: AgentConfig) {

    this.name = config.name;
    this.model_id = config.model_id;
    this.instruction = config.systemInstructions ?? "";
    this.toolRunner = config.toolRunner;
    this.memory = config.memory;
    this.model_client = config.model_client;
    this.max_iteration = config.maxIterations ?? 10;
    this.stream = config.stream ?? false;
    this.middlewareChain = new MiddlewareChain([
      ...getAutoMiddlewares(),       // env-enabled ones FIRST ,just add these auto enabled on top of what user passed !
      ...(config.middlewares ?? []), // then the ones the user passed in
    ]);
    this.outputSchema = config.outputSchema;
    this.defaultMemoryScope = config.defaultMemoryScope ?? "chat";
  }

  // Every agent has two entry points: run and run_stream.
  // Both now take the AgentInput object from the whiteboard, not a bare string -
  // because a run needs to know WHICH CHAT it belongs to, not just what was said.
  abstract run(input: AgentInput): Promise<AgentResponse>;

  /**                              yieldType                  return  send */
  abstract run_stream(input: AgentInput): AsyncGenerator<AgentEvent, AgentResponse, unknown>;
}

export default BaseAgent;
