import MemoryManager from "../index.js";
import type {
    HistoryMessage,
    MemoryRequest,
    MessageInput,
    Result,
} from "../../../globalTypes.js";



let seq = 0;

class ListMemory extends MemoryManager {
private messages: HistoryMessage[]  = [];
private maxMessages: number;
constructor(maxMessages: number) {
    super();
    this.maxMessages = maxMessages;
  }

  /** Fills in the identity fields the caller has no business knowing. */
  private stamp(request: MemoryRequest, message: MessageInput): HistoryMessage {
    seq += 1;
    return {
      id: `${Date.now().toString(36)}-${seq.toString(36)}`,
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
      chatId: request.chatId,
      ...(request.agentId !== undefined ? { agentId: request.agentId } : {}),
      ...(message.tool_call_id !== undefined ? { tool_call_id: message.tool_call_id } : {}),
      ...(message.tool_name !== undefined ? { tool_name: message.tool_name } : {}),
    };
  }

  async add(request: MemoryRequest, message: MessageInput): Promise<Result<HistoryMessage>> {
    const messsageContent = this.stamp(request, message);
    if(this.messages.length >= this.maxMessages){
        // we will need to do the compression ! before storing the messages ,since the latest memory resides in the end of the array ,we will delete from the front !


        for(let i=0;i<=this.maxMessages-2;i++){
            let currValue=this.messages[i];
            let nextValue=this.messages[i+1];

            this.messages[i]=nextValue!;
            this.messages[i+1]=currValue!;



        }
        this.messages[this.maxMessages-1]=messsageContent;

    }
    else {
        this.messages.push(messsageContent);
    }

    return { ok: true, value: messsageContent };
  }
  
  async query(request:MemoryRequest):Promise<Array<HistoryMessage>> {
    const limit = request.limit ?? 10;
    // this function is to search the string match in the Memory array and then return it
    const queryString=(request.query ?? '').toLowerCase()   
    const matchingMemories:HistoryMessage[]=[]
    if(queryString==='') return matchingMemories;          

    // newest -> oldest over the messages that EXIST, stop once we have `limit` matches
    for(let i=this.messages.length-1;i>=0 && matchingMemories.length<limit;i--){
        const m=this.messages[i];
        if(m!==undefined && m.content.toLowerCase().includes(queryString)){
            matchingMemories.push(m)
        }
    }

    return matchingMemories;
  }

 
  async get_context(request: MemoryRequest): Promise<Array<HistoryMessage>> {
      const maxItems = request.limit ?? 10;
      //this function returns the latest memory upto certain limit,
      //make an array copy the last 10 message body from the this.message and paste it and return the new array !

      const recentMemories:HistoryMessage[]=[]
      // the last `maxItems` messages that EXIST: start that many back from the end (never below 0)...
      const start=Math.max(0,this.messages.length-maxItems);
      // ...and walk FORWARD, so the conversation stays oldest -> newest
      for(let i=start;i<this.messages.length;i++){
        const m = this.messages[i];
        if (m !== undefined) recentMemories.push(m);
      }
      return recentMemories;

  }



}
export default ListMemory;
