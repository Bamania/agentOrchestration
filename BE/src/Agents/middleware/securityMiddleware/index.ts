import BaseMiddleware, { type AgentEvent, type MiddlewareContext } from "../index.js";

class SecurityMiddleware extends BaseMiddleware{

    private maliciousPattern=[
        /ignore.*previous.*instructions/i,
        /system.*prompt.*injection/i,
        /\\x[0-9a-fA-F]{2}/,             // Hex encoding attempts
        /<script.*?>.*?<\/script>/i,     // Script injection
    ]

    async *process_request(context: MiddlewareContext): AsyncGenerator<MiddlewareContext | AgentEvent, void, unknown> {
        // Only the agent_run phase sees the raw user prompt - it runs once per turn,
        // BEFORE the message is written to memory, so a blocked prompt  never lands in history.
        if(context.operation==='agent_run'){
            const message=context.agentInput.message;
            // message can be string | string[] - normalise to one string to scan
            const userQuery=Array.isArray(message) ? message.join("\n") : message;

            const matched=this.maliciousPattern.find((pattern)=>pattern.test(userQuery));
            if(matched){
                // Yielding a "blocked" event tells the pipeline to stop - nothing after
                // this middleware runs and the model is never called.
                yield {
                    type:"blocked",
                    reason:`Prompt matched a malicious pattern: ${matched}`,
                    blockedBy:"SecurityMiddleware",
                };
                return;
            }
        }

        // Clean (or not an operation we guard) - pass the context on to the next middleware.
        yield context;
    }
    async *process_response(context: MiddlewareContext): AsyncGenerator<AgentEvent | any, void, unknown> {
        
    }
    async *process_error(context: MiddlewareContext): AsyncGenerator<AgentEvent | any, void, unknown> {
        
    }

}

export default SecurityMiddleware;