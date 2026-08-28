abstract class baseMemory {

  protected messages:IMessage[]

  abstract addMessage(message:IHistoryMessage):string
  abstract removeMessage(messageID:number):string
  abstract getContext():IMessage
  // abstract getMemory():IMemory

}

export default baseMemory
