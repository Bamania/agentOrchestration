import { randomUUID } from "node:crypto";
import { EventType, type Emit } from "../shared/events/events.js";
import { streamText, type ModelMessage } from "ai";
import { SYSTEM_PROMPT } from "./system-promt.js";
import { model } from "./model.js";
import { runTool, tools } from "./test-tool.js";
import { emit } from "./bus.js";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { raw } from "express";
import type { JSONValue } from "@dbos-inc/dbos-sdk/internal/serialization";
import { buildContext, estimateTokens, KEEP_CONTEXT_TOKENS, MAX_CONTEXT_TOKENS, summarize } from "./memory.js";
// This is the seam the where whole agent execution lives in.
const MAX_STEPS = 10;
type ToolCall = { toolCallId: string; toolName: string; input: Record<string, unknown> };
type Turn = { text: string; toolCalls: ToolCall[]; responseMessages: ModelMessage[] };


// BASIC AGENT EXECUTION !! MOST OF THESE STEPS ARE PRETTY STANDARD NOW,STANDARD ENOUGH ONE SINGLE PROMPT TO GOOD MODEL 
// CAN WRITE IT FOR YOU

//   - call the model (streamText) with the task as the prompt
//   - stream tokens out as `model.delta` events
//   - when the model asks for a tool, run it and emit `tool.requested` /
//     `tool.completed`, then feed the result back to the model
//   - repeat until the model stops asking for tools
//
// We need to wrap each function call into the durable Engine support !!
async function modelTurn(workflowId: string, messages: ModelMessage[]) {
  const result = streamText({ model, messages, tools })

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {  // this part.type depends on the sdk you are using !!
      await emit({ type: EventType.ModelDelta, workflowId, text: part.text }); //dont forget to await emit ,as it is an async fx now!!
    }
  }

  const rawCalls = await result.toolCalls;
  return {
    text: await result.text,

    toolsCalls: rawCalls.map((c) => ({
      toolCallId: c.toolCallId,
      toolName: c.toolName,
      input: c.input
    })),
    responesMessages: (await result.response).messages //copied the response array !
  }


}

async function toolStep(workflowId: string, call: ToolCall): Promise<Record<string, unknown>> {
  await emit({
    type: EventType.ToolRequested,
    workflowId,
    toolCallId: call.toolCallId,
    name: call.toolName,
    args: call.input,

  })
  const output = await runTool(call.toolName, call.input);
  await emit({
    type: EventType.ToolCompleted,
    workflowId,
    toolCallId: call.toolCallId,
    result: output,
  });
  return output;
}



// ----------------------------–---------------------------------------------//
export async function agentWorkflow(input: string): Promise<string> {

  const workflowId = DBOS.workflowID ?? "unknown";

  await DBOS.runStep(
    () => emit({ type: EventType.WorkflowStarted, workflowId, input }),
    { name: "started" },
  );


  // THE LOOP. We drive it ourselves — each pass is exactly one model turn,
  // because streamText does a single generation by default.
  let step = 0;
  let turns:ModelMessage[][]=[];
  let summary='' //it will be a string 
  while (step < MAX_STEPS) {
     
      if(estimateTokens(turns.flat())>MAX_CONTEXT_TOKENS){
        const old:ModelMessage[][]=[];
        // summarize it 
        while(turns.length>1 && estimateTokens(turns.flat())>KEEP_CONTEXT_TOKENS){
            // just keep moving the context 
              const oldest=turns.shift(); 
              if(oldest){
                old.push(oldest);
              }
            }
              // now when the context window is limited just generate a summary using the context !
             summary=await DBOS.runStep(()=>summarize(old,summary),{name:`summarizing at this${step} `})
            // now measure the token for the emit data only 
            const contextTokens=estimateTokens(buildContext(SYSTEM_PROMPT,input,summary,turns))
             await DBOS.runStep(
          () =>
            emit({
              type: EventType.MemoryCompacted,
              workflowId,
              summarizedTurns: old.length,
              contextTokens,
              summary,
            }),
          { name: `compacted-${step}` },
        );



          }
    // now check if the message is alreadt bloated or not !!
    const context=buildContext(SYSTEM_PROMPT,input,summary,turns) // this context has the summary+history of the recent msgs
    const turn = await DBOS.runStep(() => modelTurn(workflowId, context), { name: `model- ${step}` })

    // Append the model's message(s) — including any tool results — to history.
   const turnMessages: ModelMessage[] = [...turn.responesMessages];
    
    // No more tool calls means the model answered. We're done.

    if (turn.toolsCalls.length === 0) {
      await DBOS.runStep(
        () => emit({ type: EventType.ModelCompleted, workflowId, text: turn.text }),
        { name: `model-done-${step}` },
      );
      await DBOS.runStep(
        () => emit({ type: EventType.WorkflowCompleted, workflowId, output: turn.text }),
        { name: "completed" },
      );
      return turn.text;
    }
    //toolCalling happened
    for (const call of turn.toolsCalls) {
      const output = await DBOS.runStep(() => toolStep(workflowId, call as ToolCall), {
        name: `tool-${call.toolCallId}`,
      });
      // Feed the tool result back to the model on the next turn.
      turnMessages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            //@ts-ignore
            output: { type: "json", value: output },
          },
        ],
      });
    }
  turns.push(turnMessages)
    step++;
  }


  await DBOS.runStep(
    () =>
      emit({
        type: EventType.WorkflowFailed,
        workflowId,
        error: `Hit the ${MAX_STEPS}-step limit without finishing.`,
      }),
    { name: "failed" },
  );
  return "";

}


export const runAgentWorkflow = DBOS.registerWorkflow(agentWorkflow, {
  name: "agentWorkflow",
}); 