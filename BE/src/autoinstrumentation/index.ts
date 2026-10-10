import type BaseMiddleware from "../Agents/middleware/index.js";
import LoggingMiddleware from "../Agents/middleware/loggingMiddleware/index.js";


export function getAutoMiddlewares(): BaseMiddleware[] {
    const auto: BaseMiddleware[] = [];
    if (process.env.AGENT_ENABLE_TELEMETRY?.toLowerCase() === "true") {
        auto.push(new LoggingMiddleware());
    }
    return auto; 
    //auto is an array that we can directly substitute for the manual buildup of the arrays 
    //during the agent execution
}
