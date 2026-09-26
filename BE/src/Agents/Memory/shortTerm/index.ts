import MemoryStrategy from "../memoryStrategy/memory-strategy.js";
import type { IMessage } from "../types.js";
class ShortTermMemory extends MemoryStrategy { 

    // private inMemory: IMessage[] = []
    constructor(){
        super()

    }

    getMemory(): IMessage[] {
        return this.messages //returns the complete Array

    }
    addMessage(message: IHistoryMessage): string {
        this.messages.push(message)
        console.log("Message adding into InMemoryDb", message)
        return "Message added successfully"
    }
    removeMessage(messageId:number):string {
        this.messages=this.messages.filter((item)=>item.id!==messageId)
        return "Message removed successfully"
    }

    updateMemory(): void {
        // Implementation for updating short-term memory
    }

}
export default ShortTermMemory
