//we wont be building an abstract calss,implementing types is
interface IMemory {
  getMemory(): void
  updateMemory(): void
  // addMessage(message: IHistoryMessage): string
  // removeMessage(messageId:number):string
}

// I message is the interface for the message that will be finally Stored in the memory
interface IMessage {
  id:number
  content:string
  timestamp:Date
}

interface IMemoryStrategy{
getMemory(): void
updateMemory(): void
// addMessage(message: IHistoryMessage): string
// removeMessage(messageId:number):string

}

export type {IMemory,IMessage,IMemoryStrategy}