//This file is mainly responsible to build the middleware async generator chain
import type { LLMInput, MiddlewareContext } from "../../../globalTypes.js";
import type BaseMiddleware from "../index.js";
import type { AgentEvent } from "../index.js";

/* sugar coating ai did for me ! in this class :P */
export type BlockedResult = Extract<AgentEvent, { type: "blocked" }>;

//I just implemented this design because it felt good to me,composite over inheritence zindabad !
class MiddlewareChain {

    private middlewares: BaseMiddleware[] = [];

    constructor(middlewares: BaseMiddleware[]) {
        this.middlewares = [...middlewares]; //copy, so the caller mutating their array can't change the chain
    }

    async *execute_stream<T>(

        // now you could say the below types are just MiddlewareContext but it has few extra thing as well which is Final fx
        //this final fx could be the tool call,model call anything  !
        ctx: MiddlewareContext, //built ONCE by the agent and passed down every level, so middleware edits survive
        func: (req: LLMInput) => Promise<T>, //the real work - takes the request so middleware edits reach it
        idx = 0, //internal - callers never pass this, the chain passes idx + 1 to itself
    ): AsyncGenerator<AgentEvent, T | BlockedResult, unknown> {

        const currMiddleware = this.middlewares[idx];

        //base condition ! just execute our PRIMARY fx ! here-final llm call
        if (!currMiddleware) {
            return await func(ctx.request);
        }

        //    now this is real fun part,each middleware has three methods,processs req /resp and error,we need to process
        //request first and if it failed then catch the error and finally response ! right


        for await (const item of currMiddleware.process_request(ctx)) {
            // 1. middleware handed the context back -> keep it (it may have changed it) and read the next item
            if ("operation" in item) {
                ctx = item;
                continue;
            }
            // 2. middleware refused -> stop the whole chain, func never runs
            if (item.type === "blocked") {
                return item;
            }
            // 3. anything else is a log/trace event -> pass it up to the agent
            yield item;
        }

        //    so before executing the func just execute all the middlewares in this middlewares variable !
        //    now the object should be passing to each middleware according to the operation !
        // (every middleware sees every operation - each one checks ctx.operation itself)

        
        let result: T | BlockedResult;
        try {
            result = yield* this.execute_stream(ctx, func, idx + 1);
        } catch (error) {
            ctx.error = error as Error;
            yield* currMiddleware.process_error(ctx);
            throw error; // rethrow - don't pretend it succeeded
        }

        ctx.response = result;
        yield* currMiddleware.process_response(ctx);

        return result;
    }
}

export { MiddlewareChain };
