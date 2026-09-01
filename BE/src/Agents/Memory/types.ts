//we wont be building an abstract calss,implementing types is
interface IMemory {
  //need to find out an fixed way of retrieving the memmory !
  //so we will be implementing the strategy design pattern !for the short term and long term 
  
}

// I message is the interface for the message that will be finally Stored in the memory
interface IMessage {
  id:number
  content:string
  timestamp:Date
}
