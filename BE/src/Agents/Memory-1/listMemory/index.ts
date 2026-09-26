import MemoryManager from "../index.js";

interface MemoryContent {
    id:number,
    content:string

}

class ListMemory extends  MemoryManager {
private messages: MemoryContent[]  = [];  //@UPDATE-type of messages to the MemoryContent
private maxMessages: number;
constructor(maxMessages: number) {
    super();
    this.maxMessages = maxMessages;
  }

  add(messsageContent:any): void { // @UPDATE-whenever a fx executes think of the success and failure msgs,maybe a json? then make a interface that is universal for every function !
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

  }
  query(messageContent:any,limit:number=10):Array<MemoryContent> { //@UPDATE-messageContent obj should be having keys that it can support the add,query and all the func 
    // this function is to search the string match in the Memory array and then return it 
    let queryString='' //@UPDATE-make sure this variable holds the string that is comming from the messageContent obj
    const matchingMemories:any=[] //@UPDATE- type of this is == this.messages
    queryString.toLowerCase();
     for(let i=this.maxMessages;i>=this.maxMessages-limit;i--){
         let storedString=this.messages[i]?.content.toLowerCase()  //@UPDATE-add the content key in the messageContent obj
         // matchingMemories.push(this.messages[i]);
         if(storedString==queryString){
            matchingMemories.push(this.messages[i])
         }

       }

       return matchingMemories;
  } 

  get_context(messageContent: any,maxItems:number=10): Array<MemoryContent> {
      //this function returns the latest memory upto certain limit,
      //make an array copy the last 10 message body from the this.message and paste it and return the new array !

      const recentMemories:any=[]//@UPDATE-update the recentMemories type to the messages type ,because it is going to store the same obj as memories
       for(let i=this.maxMessages;i>=this.maxMessages-maxItems;i--){
        recentMemories.push(this.messages[i]);

       }
       return recentMemories;

  }



}
export default ListMemory;