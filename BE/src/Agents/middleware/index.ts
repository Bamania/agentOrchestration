import type {
    AgentEvent,
    MiddlewareContext,
    MiddlewareOperation,
} from "../../globalTypes.js";

// Re-exported so middleware files can import everything from one place.
// (These used to be redeclared here as empty interfaces, which shadowed the
// real ones in globalTypes - two definitions of one name always drift.)
export type { AgentEvent, MiddlewareContext, MiddlewareOperation };

/*
process_request-before model_call and tool_execution to capture any false issue
process_response-after every successful run,for filtering logs etc
process_error-runs to handles the errors with RETRY logic
*/
abstract class BaseMiddleware{

abstract process_request(context:MiddlewareContext):AsyncGenerator<MiddlewareContext | AgentEvent,void,unknown>
abstract process_response(context:MiddlewareContext):AsyncGenerator<AgentEvent | any,void,unknown>
abstract process_error(context:MiddlewareContext):AsyncGenerator<AgentEvent | any,void,unknown>
}
export default BaseMiddleware
