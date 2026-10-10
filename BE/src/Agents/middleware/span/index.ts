class Span  {
    name:string
    startTime:number
    duration:number
    attributes:Record<string, unknown> = {}
    constructor(name:string){
        this.name=name
        this.startTime=Date.now()
        this.duration=0;
        console.log(`Span created ${this.name}`)
    }

    end(){
        console.log(`Span  ${this.name} end`)
        this.duration=Date.now()-this.startTime;
        console.log(`duration - ${this.duration}`)   
    }
    setAttribute(key:any,value:any){
        this.attributes[key]=value
        // this.value=value
    }
    
}
export {Span}