# agentOrchestration

An agent library built from scratch in TypeScript (I had built one back in 2024, but it had only a tool runner, when agents were just becoming popular).

> **Status:** I'm currently working on the **core agent layer** (inside [`BE/`](BE/)).
> Once that's done, I'll expose APIs and build a simple React app inside [`OrcPatterns/`](OrcPatterns/) on top of this custom-built agent library.

## The idea

An agent with a **feedback loop built in**.

Right now, working with an agent goes like this: it answers, I say **"FIX IT"**, it tries again, I say "FIX IT" again… N times. So it's better if the agent does that loop **on its own**: it checks its own output, finds what's wrong, and fixes it before handing it back.

Yes, I know it will burn tokens. I'm going to burn them anyway by typing "FIX IT" N times, so the agent might as well do it itself. Plus, I'm lazy.

## What's in `BE/` so far

| Piece | What it does |
|---|---|
| **Agent loop** | Calls the model, runs the tools it asks for, feeds the results back, and repeats, up to a max number of iterations |
| **Tool runner** | A registry of tools; adding a tool never means editing the runner |
| **Memory** | Conversation history scoped per chat |
| **Middleware** | An async-generator middleware chain (onion model) with request / response / error hooks and the ability to block a request, e.g. a prompt-injection security middleware |
| **LLM providers** | OpenAI and Gemini behind one interface; the agent can't tell which one answered |
| **Auto-instrumentation** | An env flag that adds a telemetry middleware to every agent |
| **Agent as tool** |  in progress: letting one agent call another agent like any other tool |

The design decisions, and the mistakes along the way, are written up in [`BE/difficulties.md`](BE/difficulties.md).

## Run it

```bash
cd BE
npm install
cp .env.example .env      # add an OpenAI or Gemini key; with no key, test.js uses a fake model
npx tsc && node test.js
```
(STILL WORKING ON IT WHENEVER I GET TIME)
