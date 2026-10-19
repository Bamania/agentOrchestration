# BE – the core agent library
The agent library itself, written from scratch in TypeScript. Everything else in this repo (the API and the React app in OrcPatterns/) will be built on top of this.

The idea is to build an inbuilt feedback loop cycle in this agent library (still not built, but this is what I am trying to achieve with this project).



`test.js` builds an agent and runs a few scenarios: a simple question, memory across turns, a tool call, streaming events, and the middleware chain blocking a prompt injection.


## What's where

| Folder / file | What it is |
|---|---|
| [`src/globalTypes.ts`](src/globalTypes.ts) | The shared types: `AgentInput`, `LLMInput`, `AgentResponse`, `AgentEvent`, `MiddlewareContext`, `HistoryMessage`… |
| [`src/Agents/baseAgent.ts`](src/Agents/baseAgent.ts) | The abstract agent: holds the config and builds the middleware chain |
| [`src/Agents/SimpleAgent/`](src/Agents/SimpleAgent/index.ts) | The concrete agent and its tool-calling loop |
| [`src/Agents/toolRunner/`](src/Agents/toolRunner/index.ts) | Tool registry + parallel execution; a tool is anything that implements `ITool` |
| [`src/Agents/Memory-1/`](src/Agents/Memory-1/index.ts) | `MemoryManager` (abstract) and `ListMemory` (in-process list) |
| [`src/Agents/middleware/`](src/Agents/middleware/index.ts) | `BaseMiddleware`, the async-generator `MiddlewareChain`, plus security and logging middlewares and a `Span` |
| [`src/llmProviders/`](src/llmProviders/lllmProvider.ts) | `llmProvider` (abstract) with OpenAI and Gemini adapters |
| [`src/autoinstrumentation/`](src/autoinstrumentation/index.ts) | Env-driven middlewares that are added to every agent |
| [`src/adapters/`](src/adapters/) | Agent-as-tool adapter (in progress) |
| [`src/config.ts`](src/config.ts) | Loads `.env` and exports the typed `config` |
| [`test.js`](test.js) | Manual smoke test (imports from `dist/`) |

## Middleware

A middleware has three hooks, each an async generator:

| Hook | Runs | Can |
|---|---|---|
| `process_request` | on the way in | change the context, or block the request |
| `process_response` | on the way out, after success | observe and report |
| `process_error` | on the way out, after an error | observe and report |

The chain runs them like an onion: requests run first → last, and responses run last → first. A middleware decides what to act on by checking `ctx.operation` (`agent_run`, `model_call`, `tool_call`, `memory_access`).


