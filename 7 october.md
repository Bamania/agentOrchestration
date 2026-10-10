# Type Flow — Agent Orchestration

Every type currently in the repo, and where it lives in the request lifecycle.

---

## 1. The master flow

```mermaid
flowchart TD
    subgraph S1["STAGE 1 · CONSTRUCTION (once per agent)"]
        CFG["AgentConfig<br/><i>baseAgent.ts</i>"]
        INIT["AgentInitialization<br/>name · model_id · systemInstructions<br/>tools · stream · outputSchema<br/>maxIterations · defaultMemoryScope"]
        COLLAB["injected collaborators<br/>IToolRunner · MemoryManager · llmProvider"]
        CFG --> INIT
        CFG --> COLLAB
    end

    CFG ==> AGENT["<b>Agent</b> instance<br/><i>extends BaseAgent</i>"]

    subgraph S2["STAGE 2 · ONE USER TURN (per run call)"]
        AIN["AgentInput<br/>message · chatId · userId<br/>stream · outputSchema · state"]
        CTX["AgentContext<br/>runId · chatId · agentId · userId<br/>iteration · state<br/><b>MUST stay JSON-serializable</b>"]
        AIN --> CTX
    end

    AGENT ==> AIN

    subgraph S3["STAGE 3 · THE LOOP (N times per run)"]
        direction TB
        REQ["MemoryRequest<br/>scope · chatId · agentId<br/>userId · query · limit"]
        ENRICH{{"LLM INPUT ENRICHMENT"}}
        LLMIN["LLMInput<br/>model · systemPrompt · messages<br/>recalled · tools · outputSchema<br/>stream · maxTokens · temperature · signal"]
        RESP["AgentResponse<br/><i>discriminated union</i>"]
        REQ --> ENRICH
        ENRICH --> LLMIN
        LLMIN --> RESP
    end

    CTX ==> REQ

    RESP --> BRANCH{"response.kind"}
    BRANCH -->|"final"| OUT["return AgentResponse"]
    BRANCH -->|"blocked"| OUT
    BRANCH -->|"tool_request"| TOOLS["ToolCall array"]
    TOOLS --> RUNNER["IToolRunner.execute()"]
    RUNNER --> TRES["ToolResult array"]
    TRES --> WRITE["memory.add()"]
    WRITE -.->|"next iteration"| REQ

    style S1 fill:#1e3a5f,stroke:#4a90d9,color:#fff
    style S2 fill:#1e5f3a,stroke:#4ad990,color:#fff
    style S3 fill:#5f3a1e,stroke:#d9904a,color:#fff
    style ENRICH fill:#5f1e4a,stroke:#d94a90,color:#fff
```

---

## 2. Three lifetimes — why these are three different types

The single most important thing on the whiteboard was the **vertical dividing lines**.
They are layer seams, and each stage has its own type because each has its own *lifetime*.

```mermaid
flowchart LR
    A["<b>AgentInitialization</b><br/>────────────<br/>created: once<br/>lives: life of the agent<br/>churn: rare"]
    B["<b>AgentInput</b><br/>────────────<br/>created: per run call<br/>lives: one user turn<br/>churn: rare"]
    C["<b>LLMInput</b><br/>────────────<br/>created: per model call<br/>lives: one iteration<br/>churn: <b>constant</b>"]

    A -->|"+ user's message"| B
    B -->|"+ memory, tools, instructions"| C

    style A fill:#1e3a5f,stroke:#4a90d9,color:#fff
    style B fill:#1e5f3a,stroke:#4ad990,color:#fff
    style C fill:#5f3a1e,stroke:#d9904a,color:#fff
```

**The test for "is this type stable?"**

> Would it still exist if you swapped OpenAI → Anthropic? in-memory → Redis? dropped tools?

| type | survives? | verdict |
|---|---|---|
| `HistoryMessage`, `AgentResponse`, `TokenUsage`, `Role` | yes | **domain type** — slow-changing |
| `AgentInitialization`, `AgentInput` | yes | **domain type** |
| `LLMInput` | **no** — `signal`, `outputSchema`, `temperature` are provider concerns | **boundary type** — expected to churn |

`LLMInput` churning is **normal**. That was difficulty #2 — the mistake was expecting it to be stable.

---

## 3. The enrichment step (the heart of it)

The left-hand note on the whiteboard said *"LLM Input enrichment!"*. This is it — a thin
`AgentInput` becomes a fat `LLMInput`, and everything added comes from an injected collaborator.

```mermaid
flowchart TD
    IN["AgentInput<br/>message · chatId"]

    IN --> SCOPE["build MemoryRequest<br/>scope · chatId · agentId · userId"]

    SCOPE --> M1["memory.get_context(req)<br/><i>scope: 'chat'</i>"]
    SCOPE --> M2["memory.query(req)<br/><i>scope: 'agent'</i>"]

    M1 --> H1["HistoryMessage[]<br/><b>messages</b><br/><i>this conversation</i>"]
    M2 --> H2["HistoryMessage[]<br/><b>recalled</b><br/><i>across all chats</i>"]

    TR["toolRunner.getDefinitions()"] --> TD["ToolDefinition[]"]
    SYS["this.instruction"] --> SP["systemPrompt"]

    H1 --> BUILD["<b>LLMInput</b>"]
    H2 --> BUILD
    TD --> BUILD
    SP --> BUILD

    BUILD --> PROV["llmProvider.create(LLMInput)"]

    style BUILD fill:#5f3a1e,stroke:#d9904a,color:#fff
    style M1 fill:#1e5f3a,stroke:#4ad990,color:#fff
    style M2 fill:#1e5f3a,stroke:#4ad990,color:#fff
```

**Why `messages` and `recalled` stay separate:** a flat array would force the memory layer
to decide how recalled facts are expressed. Keeping them apart pushes that decision down
to the provider, where it belongs — OpenAI puts recall in a system block; another provider
may want it inline. Same lesson as the adapter pattern in difficulty #4.

---

## 4. Memory — the scope axis

```mermaid
flowchart TD
    MM["<b>MemoryManager</b> (abstract)<br/><i>Memory-1/index.ts</i>"]
    MM --> A1["add(MemoryRequest, MessageInput)<br/>→ Promise&lt;Result&lt;HistoryMessage&gt;&gt;"]
    MM --> A2["query(MemoryRequest)<br/>→ Promise&lt;HistoryMessage[]&gt;"]
    MM --> A3["get_context(MemoryRequest)<br/>→ Promise&lt;HistoryMessage[]&gt;"]

    MM -.->|extends| LM["<b>ListMemory</b><br/>array-backed, maxMessages window"]

    SCOPE["MemoryScope"]
    SCOPE --> SC1["'chat'<br/>→ this conversation's history<br/>→ dies with the chat"]
    SCOPE --> SC2["'agent'<br/>→ survives across chats<br/>→ 'agent will rem across different chats'"]

    style MM fill:#1e5f3a,stroke:#4ad990,color:#fff
    style SCOPE fill:#5f1e4a,stroke:#d94a90,color:#fff
```

`MemoryRequest` carries the scope on **every** call. Without it, one user's conversation
leaks into another's prompt — that is a correctness issue, not a nicety.

---

## 5. Tool execution

```mermaid
flowchart LR
    RESP["AgentResponse<br/>kind: 'tool_request'"] --> TC["<b>ToolCall</b><br/>id · tool_name<br/>type · parameters"]
    TC --> IR["<b>IToolRunner</b><br/>.execute(calls)"]
    IR --> REG[("registry<br/>Map&lt;name, ITool&gt;")]
    REG --> IT["<b>ITool</b><br/>tool_name<br/>schema: ToolDefinition<br/>execute(args)"]
    IT --> TRES["<b>ToolResult</b><br/>tool_call_id<br/>tool_name · output"]
    TRES --> MEM["memory.add()<br/>role: 'tool'"]
    MEM -.->|"becomes HistoryMessage<br/>in the next iteration"| LOOP["loop again"]

    IR -.->|".getDefinitions()"| TD["<b>ToolDefinition</b><br/>type: 'function'<br/>function: name, description, parameters"]
    TD -.-> LLM["into LLMInput.tools"]

    style IR fill:#5f3a1e,stroke:#d9904a,color:#fff
    style REG fill:#3a3a3a,stroke:#888,color:#fff
```

The registry is why adding a tool never edits `ToolRunner` or the agent loop — OCP,
from difficulty on the tool runner.

**Note the arrow back into memory.** Tool results are no longer concatenated into a local
string that dies when `run()` returns — they become real `HistoryMessage` rows, which is
the `Tools_output / chat-Id (memory → tx)` arrow on the whiteboard.

---

## 6. The two discriminated unions

These are the types that make illegal states **unrepresentable** rather than merely discouraged.

```mermaid
flowchart TD
    AR["<b>AgentResponse</b>"]
    AR --> F["kind: 'final'<br/>message: string<br/>+ usage, model, finishReason"]
    AR --> T["kind: 'tool_request'<br/>tool_calls: ToolCall[]<br/>+ usage, model, finishReason"]
    AR --> B["kind: 'blocked'<br/>reason · blockedBy<br/>+ usage, model, finishReason"]

    style F fill:#1e5f3a,stroke:#4ad990,color:#fff
    style T fill:#5f3a1e,stroke:#d9904a,color:#fff
    style B fill:#5f1e1e,stroke:#d94a4a,color:#fff
```

**What the old shape allowed:**

| `message` | `tool_calls` | legal? |
|---|---|---|
| `"hi"` | `undefined` | yes — final answer |
| `null` | `[...]` | yes — tool request |
| `null` | `undefined` | **no** — nothing happened |
| `"hi"` | `[...]` | **no** — the loop silently dropped the message |

Row 4 was a live bug: `if (!response.tool_calls?.length)` meant a response carrying both
would take the tool branch and discard the text with no error. The union makes rows 3 and 4
impossible to construct.

```mermaid
flowchart LR
    AE["<b>AgentEvent</b><br/><i>streaming / observability</i>"]
    AE --> E1["run_started<br/>llm_call_started<br/>llm_token<br/>llm_call_completed"]
    AE --> E2["tool_started<br/>tool_completed"]
    AE --> E3["memory_written"]
    AE --> E4["blocked<br/>error<br/>run_completed"]

    style AE fill:#1e3a5f,stroke:#4a90d9,color:#fff
```

---

## 7. Middleware — and the `operation` key

```mermaid
flowchart TD
    MC["<b>MiddlewareContext</b><br/>operation: MiddlewareOperation<br/>agentContext: AgentContext<br/>request: LLMInput<br/>response?: AgentResponse<br/>error?: Error"]

    MC --> P1["process_request<br/><i>before the model/tool call</i>"]
    MC --> P2["process_response<br/><i>after a successful call</i>"]
    MC --> P3["process_error<br/><i>retry / recovery</i>"]

    P1 --> Y["AsyncGenerator yields<br/>MiddlewareContext | AgentEvent"]
    P2 --> Y
    P3 --> Y

    style MC fill:#5f1e4a,stroke:#d94a90,color:#fff
```

### The interception points

An agent has **more than one** place middleware can wrap, and they are not the same.
`operation` says which one this invocation is at.

```mermaid
flowchart TD
    RUN["agent.run(input)"] -.->|"operation: 'agent_run'"| O1["once per user turn<br/>auth · overall timeout · request logging"]
    RUN --> LOOP{{"for iteration 0..max"}}
    LOOP --> MODEL["model_client.create(LLMInput)"]
    MODEL -.->|"operation: 'model_call'"| O2["once per iteration<br/>retry on 429 · token accounting · caching"]
    MODEL --> TOOLS["toolRunner.execute(calls)"]
    TOOLS -.->|"operation: 'tool_call'"| O3["once per tool<br/>permissions · sandboxing · truncation"]
    TOOLS -.-> LOOP

    style O1 fill:#1e3a5f,stroke:#4a90d9,color:#fff
    style O2 fill:#5f3a1e,stroke:#d9904a,color:#fff
    style O3 fill:#1e5f3a,stroke:#4ad990,color:#fff
```

| `operation` | fires | what belongs here |
|---|---|---|
| `agent_run` | once per user turn | auth, overall timeout, request logging |
| `model_call` | once per loop iteration (**N times**) | retry on 429, token accounting, model fallback, caching |
| `tool_call` | once per tool execution | tool permissions, sandboxing, truncating huge outputs |
| `memory_access` | per memory read/write | audit logging, PII scrubbing before storage |

**Why the field is necessary.** Without it, `response` is ambiguous — a
`process_response` running at `model_call` sees the result of iteration 4, while one
running at `agent_run` sees the final answer. Same method, same context type, completely
different meaning. A token counter wants `model_call`; a "log the final answer"
middleware wants `agent_run`. `operation` is what lets a middleware tell them apart and
ignore the invocations it does not care about:

```
if (context.operation !== "model_call") { yield context; return; }
```

**Open modelling question:** `request` is typed `LLMInput`, which fits `model_call`
cleanly but not `tool_call` — a tool invocation's request is really a `ToolCall`, not an
`LLMInput`. Either widen `request` to a union, or give the tool interception point its
own context type.

## 8. Full type reference

### `src/globalTypes.ts`

| § | type | kind | purpose |
|---|---|---|---|
| 1 | `ChatId` `AgentId` `UserId` `RunId` `MessageId` | alias | readable scope at call sites |
| 2 | `Role` | union | `user` / `assistant` / `system` / `tool` |
| 2 | `HistoryMessage` | interface | the stored unit — id, role, content, timestamp, chatId |
| 2 | `MessageInput` | interface | what a caller supplies; ids stamped by memory |
| 3 | `Result<T,E>` | **union** | `{ok:true,value}` \| `{ok:false,error}` |
| 4 | `MemoryScope` | union | `chat` \| `agent` |
| 4 | `MemoryRequest` | interface | the one object all 3 memory methods take |
| 5 | `AgentContext` | interface | transient run state — **JSON-serializable** |
| 6 | `AgentInitialization` | interface | construction-time settings |
| 7 | `AgentInput` | interface | one user turn |
| 8 | `LLMInput` | interface | the enriched provider request |
| 9 | `TokenUsage` | interface | input / output / total |
| 9 | `FinishReason` | union | stop, tool_calls, length, content_filter, blocked, error |
| 9 | `AgentResponse` | **union** | final \| tool_request \| blocked |
| 10 | `AgentEvent` | **union** | 10 event kinds |
| 11 | `MiddlewareContext` | interface | agentContext + request + response? + error? |

### `src/Agents/toolRunner/types.ts`

| type | kind | purpose |
|---|---|---|
| `ToolCall` | interface | a tool the model asked for, provider-normalized |
| `ToolResult` | interface | what came back, keyed by `tool_call_id` |
| `ToolDefinition` | interface | the schema handed to the LLM |
| `ITool` | interface | one executable tool (Strategy) |
| `IToolRunner` | interface | the collaborator the agent depends on |

### Elsewhere

| type | file | purpose |
|---|---|---|
| `AgentConfig` | `Agents/baseAgent.ts` | `AgentInitialization` + the 3 collaborators |
| `BaseAgent` | `Agents/baseAgent.ts` | abstract — `run` / `run_stream` |
| `MemoryManager` | `Agents/Memory-1/index.ts` | abstract — `add` / `query` / `get_context` |
| `llmProvider` | `llmProviders/lllmProvider.ts` | abstract — `create` / `create_stream` |
| `BaseMiddleware` | `Agents/middleware/index.ts` | abstract — the 3 process methods |

---

## 9. Open items

| # | issue | why it matters |
|---|---|---|
| 1 | **`middleware/index.ts` redeclares `MiddlewareContext` and `AgentEvent` as empty interfaces** | two definitions of the same name will drift — import from `globalTypes` instead |
| 2 | Middleware is never called by the loop | `MiddlewareContext` exists, nothing constructs it |
| 3 | `userId` ignored by `ListMemory` | two users sharing an agent would mix agent-scoped memory |
| 4 | `ListMemory.query` / `get_context` start at `i = maxMessages` | reads one past the end; uses capacity, not `messages.length` |
| 5 | `query` never assigns `queryString` from the request before lowercasing | comparison always runs against `''` |
| 6 | `role: "tool"` replayed as assistant text | real tool messages need the assistant's `tool_calls` payload stored first |
| 7 | No `AgentOutput` wrapper | `run()` returns `AgentResponse` directly; whiteboard listed a separate output type |

---

## 10. One-line summary

```
AgentConfig ──once──> Agent ──per turn──> AgentInput ──enrich──> LLMInput ──> AgentResponse
                                               │                    ▲              │
                                               │                    │              ├─ final ──> return
                                               └──> MemoryRequest ──┘              ├─ blocked ─> return
                                                         │                         └─ tool_request
                                                    HistoryMessage[]                      │
                                                         ▲                           ToolCall[]
                                                         │                                │
                                                         └────── ToolResult <──── IToolRunner
```
