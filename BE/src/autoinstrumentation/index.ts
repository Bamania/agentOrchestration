import type BaseMiddleware from "../Agents/middleware/index.js";
import LoggingMiddleware from "../Agents/middleware/loggingMiddleware/index.js";
import { config } from "../config.js";


export function getAutoMiddlewares(): BaseMiddleware[] {
    const auto: BaseMiddleware[] = [];
    if (config.enableTelemetry) { // AGENT_ENABLE_TELEMETRY in .env
        auto.push(new LoggingMiddleware());
    }
    return auto; 
    //auto is an array that we can directly substitute for the manual buildup of the arrays 
    //during the agent execution
}
