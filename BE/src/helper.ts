import type { AgentInput } from "./globalTypes.js";

export  function formatToCortexMessage(message:string):AgentInput{
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

// NOTE: response formatting is no longer a shared helper. Each provider now
// normalizes its OWN raw response into AgentResponse (e.g.
// OpenAiProvider.formatopenAiResponse), so the agent stays provider-agnostic
// and adding a provider never edits a central switch.
