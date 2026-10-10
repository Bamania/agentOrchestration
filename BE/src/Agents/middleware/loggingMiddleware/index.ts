import BaseMiddleware, { type AgentEvent, type MiddlewareContext } from "../index.js";
import { Span } from "../span/index.js";

class LoggingMiddleware extends BaseMiddleware {

   
    //@Update-understand why you would require the AgentEvent as the yield type?

    async *process_request(context:MiddlewareContext):AsyncGenerator<MiddlewareContext | AgentEvent, void, unknown>{
        //create Span,attach it to the context let it be carried for each step !
        const operation=context.operation
        let span;
        if(operation=="model_call") {
             span=new Span(`${context.request.model}`)

        }
        // context["metadata"]=span

        context.metadata["_otel_span"] = span;
        context.metadata["_otel_start"] = span!.startTime;
        
        
        yield context;
    }
     async *process_response(context: MiddlewareContext): AsyncGenerator<AgentEvent | any, void, unknown> {
        let span=context.metadata["_otel_span"];
        span.end();
        
        // let totalTime=time-Date.now();
        // console.log(`totaltime=${totalTime/1000} } `)
        yield context
    }
    async *process_error(context: MiddlewareContext): AsyncGenerator<AgentEvent | any, void, unknown> {
        
    }

}

export default LoggingMiddleware