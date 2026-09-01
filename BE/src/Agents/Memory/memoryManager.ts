// this class is mainly because we wish to have a memeoryManger which will just give the required 
// memeory to the agent base ,without letting the client follow complex cycle abstract class memoryManager{
class memoryManager{
  //This class is a facade ! 
   MemoryStrategy Obj; 

  constructor(memoryObj){
    this.obj=Obj;
  }
  //i only named memory this layer because i dont want the client to worry about to 
  //get the short term or long term,they just need to tell me in the constructor for the
  //constructor injection ! and thats it  
  function getMemory(){
    const shortTermMemory=new shortTermMemory this.obj.getMemory();
  }

  function updateMemory(){
    this.obj.updateMemory()
  }
  //SINCE THIS CLASS HAS TO BUILD THE memory for agent
  
  // abstract getMemory():IMemory

}

export default memoryManager
