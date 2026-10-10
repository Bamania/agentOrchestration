import type {
    HistoryMessage,
    MemoryRequest,
    MessageInput,
    Result,
} from "../../globalTypes.js";

/**
 * A place an agent stores and retrieves content.
 *
 * Every method takes a MemoryRequest, which carries the SCOPE - whether this
 * operation is about one chat's history or the agent's cross-chat knowledge.
 * Without that scope one user's conversation leaks into another's prompt.
 *
 * All three are async because the real backends are a db and local disk; an
 * in-process array simply resolves immediately.
 */
abstract class MemoryManager {
    /** store new content in memory! */
    abstract add(request: MemoryRequest, message: MessageInput): Promise<Result<HistoryMessage>>;

    /** retrieve relevant memories based on query! */
    abstract query(request: MemoryRequest): Promise<HistoryMessage[]>;

    /** get recent/relevant context for augmenting the LLM prompt! */
    abstract get_context(request: MemoryRequest): Promise<HistoryMessage[]>;
    /*
    get context will execute the sophisticated retrieval logic,from simple recency filtering to semantic similarity search !
    Query method provides the foundation for the retrieval augmented generation !
    Agent Context is what we need to manage the current session state during the Agent execution ,userId,sessionid and etc
    and shared state for the orchestration !
    Agent context typically resets between the major interactions
    WE NEED TO understand the agent context,as  it enables the STATELESS AGENT EXECUTION WHERE ANY SERVER CNA HANDLE RESUME REQUESTS WITHOUT MAINTAINING Session state in memory,
    a critical design for scalable web dev !
    -stateless agents,(push the ctx from the client,server storing it in the db or redis  and implemneting the locker method when required )

    NOTE: that "agent context" is now a real type - AgentContext in globalTypes.
    It is deliberately JSON-serializable so it can round-trip through Redis and
    let any server resume a run. Memory (this class) is durable CONTENT;
    AgentContext is transient per-run STATE. Different lifetimes, different types.
    */
}

export default MemoryManager;
