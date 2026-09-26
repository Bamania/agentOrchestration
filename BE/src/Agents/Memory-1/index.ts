abstract class MemoryManager{
 
    abstract add(message: any): void; //store new content in memory!
    abstract query(message: any): void; //retrieve relevant memories based on query !
    abstract get_context(message: any): void;  //get recent/relevant context for augmenting the LLM prompt!
    /*
    get context will execute the sophisticated retrieval logic,from simple recency filtering to semantic similarity search !
    Query method provides the foundation for the retrieval augmented generation ! 
    Agent Context is what we need to manage the current session state during the Agent execution ,userId,sessionid and etc
    and shared state for the orchestration !
    Agent context typically resets between the major interactions 
    WE NEED TO understand the agent context,as  it enables the STATELESS AGENT EXECUTION WHERE ANY SERVER CNA HANDLE RESUME REQUESTS WITHOUT MAINTAINING Session state in memory,
    a critical design for scalable web dev !
    -stateless agents,(push the ctx from the client,server storing it in the db or redis  and implemneting the locker method when required )
    */

} 

export default MemoryManager
