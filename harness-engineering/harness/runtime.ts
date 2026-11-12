import { randomUUID } from "node:crypto";
import { EventType, type Emit } from "../shared/events/events.js";
import { streamText, type ModelMessage } from "ai";
import { SYSTEM_PROMPT } from "./system-promt.js";
import { model } from "./model.js";
import { tools } from "./test-tool.js";
// This is the seam the where whole agent execution lives in.


// BASIC AGENT EXECUTION !! MOST OF THESE STEPS ARE PRETTY STANDARD NOW,STANDARD ENOUGH ONE SINGLE PROMPT TO GOOD MODEL 
// CAN WRITE IT FOR YOU

//   - call the model (streamText) with the task as the prompt
//   - stream tokens out as `model.delta` events
//   - when the model asks for a tool, run it and emit `tool.requested` /
//     `tool.completed`, then feed the result back to the model
//   - repeat until the model stops asking for tools
//


const MAX_STEPS = 10;

// THE BRITTLE AGENT.
//
// This is a script with an LLM in the middle. It works in a demo and dies in
// production a dozen ways:
//
//   · the `messages` array lives in memory      → crash = total loss
//   · tools run with no mediation               → `sendReply` just fires
//   · history only grows                        → context bloat
//   · one agent does everything                 → no specialization
//
// Make it work, then look at everything it gets wrong.
export async function runAgent(opts: { input: string; emit: Emit }): Promise<void> {
  const { input, emit } = opts;
  const workflowId = randomUUID();
  emit({ type: EventType.WorkflowStarted, workflowId, input });


  //small in memory Msg array,imagine you fetch the messages from the DB !
  const messages: ModelMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: input },
  ];

  // THE LOOP. We drive it ourselves — each pass is exactly one model turn,
  // because streamText does a single generation by default.
  let step = 0;
  while (step < MAX_STEPS) {
    const result = streamText({ model, messages, tools });

    // Forward everything the model does onto the harness event stream so the
    // inspector can render it. (`part.type` here is the AI SDK's, not ours.)
    for await (const part of result.fullStream) {
      switch (part.type) {
        case "text-delta":
          emit({ type: EventType.ModelDelta, workflowId, text: part.text });
          break;
        case "tool-call":
          emit({
            type: EventType.ToolRequested,
            workflowId,
            toolCallId: part.toolCallId,
            name: part.toolName,
            args: part.input,
          });
          break;
        case "tool-result":
          emit({
            type: EventType.ToolCompleted,
            workflowId,
            toolCallId: part.toolCallId,
            result: part.output,
          });
          break;
        case "error":
          emit({ type: EventType.WorkflowFailed, workflowId, error: String(part.error) });
          return;
      }
    }

    // Append the model's message(s) — including any tool results — to history.
    messages.push(...(await result.response).messages);

    // No more tool calls means the model answered. We're done.
    const toolCalls = await result.toolCalls;
    if (toolCalls.length === 0) {
      const text = await result.text;
      emit({ type: EventType.ModelCompleted, workflowId, text });
      emit({ type: EventType.WorkflowCompleted, workflowId, output: text });
      return;
    }

    step++;
  }

  emit({
    type: EventType.WorkflowFailed,
    workflowId,
    error: `Hit the ${MAX_STEPS}-step limit without finishing.`,
  });
}