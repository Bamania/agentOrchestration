// this class is mainly because we wish to have a memeoryManger which will just give the required 

import LongTermMemory from "./longTerm/index.js";
import MemoryStrategy from "./memoryStrategy/memory-strategy.js";
import type memoryStrategy from "./memoryStrategy/memory-strategy.js";
import ShortTermMemory from "./shortTerm/index.js";
import type { IMemory } from "./types.js";

// memeory to the agent base ,without letting the client follow complex cycle abstract class memoryManager{
class MemoryManager implements IMemory {
  //This class is a facade ! 
  shortTerm=new MemoryStrategy(new ShortTermMemory())
  longTerm=new MemoryStrategy(new LongTermMemory())
  //i only named memory this layer because i dont want the client to worry about to 
  //get the short term or long term,they just need to tell me in the constructor for the
  //constructor injection ! and thats it  
  getMemory() {
    const shortTermMemory=this.shortTerm.getMemory()
    const longTermMemory=this.longTerm.getMemory()
    return {shortTermMemory,longTermMemory};

  }
  updateMemory() {

  }
}

