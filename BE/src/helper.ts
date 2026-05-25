import type { AgentInput } from "./globalTypes.js";

export default function formatToCortexMessage(message:string):AgentInput{
    if(!message.trim()) throw new Error("Message cannot be empty");
    // if(Array.isArray(message)) {
    //     ["hey there","how are you?!"]
        
    // }
        return {
        content:message,
        role:"user",
        name:""
    }
}