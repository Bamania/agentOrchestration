//we wont be building an abstract calss,implementing types is
interface IMemory {
  //need to find out an fixed way of retrieving the memmory !
}

// I message is the interface for the message that will be finally Stored in the memory
interface IMessage {
  id:number
  content:string
  timestamp:Date
}