import { generateText } from "ai";
import type { ModelMessage } from "ai";
import { model } from "./model.js";

// Compact once the recent-turns window grows past MAX_CONTEXT_TOKENS, peeling
// the oldest turns into the summary until it's back under KEEP_CONTEXT_TOKENS.
// Token budget — not turn count — is what actually drives context bloat, and it
// holds up even when the model batches many tool calls into one turn.
// (Rough estimate: ~4 chars per token. Kept low so compaction kicks in on a short task.)
export const MAX_CONTEXT_TOKENS = 3000;
export const KEEP_CONTEXT_TOKENS = 1500;

// dont hate me doing this ! xD (i wanna finish this cute demo project that is why not goind deep into the tokenizers at this point)
export function estimateTokens(messages: ModelMessage[]): number {
    const chars = messages.reduce(
        (n, m) =>
            n + (typeof m.content === "string" ? m.content.length : JSON.stringify(m.content).length),
        0,
    );
    return Math.ceil(chars / 4);
}

// Three different things, on purpose:
//   · HISTORY  = everything that happened — the durable event log .
//   · STATE    = a running SUMMARY of older turns (compacted working memory).
//   · CONTEXT  = what the model actually sees THIS turn, assembled on demand.
//
// buildContext hydrates the context: the system prompt, the pinned task, the
// summary of old work, and only the most recent turns verbatim.
export function buildContext(
    systemPrompt: string,
    task: string,
    summary: string,
    turns: ModelMessage[][],
): ModelMessage[] {
    const context: ModelMessage[] = [
        { role: "system", content: systemPrompt }, // the CURRENT agent's prompt
        { role: "user", content: task }, // the goal is pinned, never summarized away ,,just pass the task you dont wish to give it away!
    ];
    if (summary) {
        context.push({ role: "system", content: `Summary of earlier work so far:\n${summary}` });
    }
    for (const turn of turns) context.push(...turn); // recent turns, verbatim
    return context;
}

// Compress old turns into the running summary. This is an LLM call, so in the
// runtime it's wrapped in a DBOS step — the summary is checkpointed and a crash
// won't re-summarize.
export async function summarize(
    oldTurns: ModelMessage[][],
    priorSummary: string,  //summary we already have !to store that
): Promise<string> {
    const transcript = oldTurns
        .flat()
        .map((m) => {
            let text;
                // just get the text dude !
            if (typeof m.content === "string") {
                text = m.content;
            } else {
                text = JSON.stringify(m.content);
            }

            return `${m.role}: ${text}`;
        });

  const result=  transcript.join("\n")
        .slice(0, 6000);
        // cut the context till 6k and then summarize it !

    const { text } = await generateText({
        model,
        messages: [
            {
                role: "system",
                content:
                    "You compress an agent's work log into a short running summary. Preserve concrete facts: item ids, categories, draft ids, amounts, and what was already sent. Be terse.",
            },
            {
                role: "user",
                content: `Prior summary:\n${priorSummary || "(none)"}\n\nFold in this newer work:\n${result}\n\nReturn the updated summary.`,
            },
        ],
    });
    return text;
}