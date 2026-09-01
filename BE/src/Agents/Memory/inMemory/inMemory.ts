import baseMemory from "../baseMemory.js";
class InMemory extends baseMemory { 

    // private inMemory: IMessage[] = []
    constructor(){
        super()

    }

    getContext(): IMessage {
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


}
