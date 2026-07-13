abstract class memoryManager {

  protected messages:IMessage[]

  abstract addMessage(message:IHistoryMessage):string
  abstract removeMessage(messageID:number):string
  abstract fetchconversationHistory():IMessage


asdI}
