# Difficulties

## #1

The first difficulty I faced was how to create the right abstraction layer. For eg, should I make the client in the `llmProvider` abstract class, or should I implement it in the concrete classes?

---

## #2

Too many additions and changes in the parameters of the `create` fx of the `llmProvider`! So I just created an `llmInput` type!

→ But then again, I shouldn't have made it for the `create` fx!

---

## #3

How to handle the output with structured schema enabled! Currently having a flag to allow the agent API call to generate the output in structured format.

For eg, if you use an interface, it's a compile-time type check; it doesn't exist at runtime. So to validate the user inputs at runtime, it's necessary that you involve some runtime validator, which is our **ZOD**!

---

## #4

Struggling to define a unified schema for the `toolExecute` fx!

```
response {
    message: "content"
    toolName: "websearchtool"
    previousMessage: "message which invokes the tool call"
    toolDescription: "maybe not so important"
}
```

---

## Important note

I just realized how to stop getting confused: for that, always assume that whatever object is coming from the provider layer, it must be formatted according to our enigma agent.

But there is a catch. Initially I was thinking that if I could make a helper fx that will format the LLM response (when I say LLM response, I mean the raw response from the provider layer), we can directly send the response from our agent layer. But it was so wrong!

- First, we should just have followed the **adapter pattern**, as the provider raw response could be different for each provider. So instead of having one unified function, we should just have a private function for each provider! Though I was following the switch case.

---

**I was making a `toolRunner` class as a helper fx** with a lot of if and else statements, due to which I was not following the **OCP principle**! So each time I had to get a new tool, I had to go to the helper function and add a new switch statement. So the better method was to build a **registry**! And then pass the `toolRunner` (with all the tools installed)…

**Ans** – we should imagine a class and its behaviours. For eg, an agent concrete class will have a tool runner, memory manager maybe?, etc etc. Instead of having pure functions for the agent, we could just make a new class and pass its instance to the concrete class at runtime! That's composite for you…

…to each agent, so that whenever the agent gets the LLM response asking for the tool execution, since the agent now also has the tool runner object, it will also be able to call the required tool using its `execute` fx!

### LEARNING → The mnemonic

| | | |
|---|---|---|
| **is-a** | share a skeleton, one family tree, stable base | → **inheritance** (`SimpleAgent`) |
| **has-a** | swap at runtime, vary on many axes, wrap/combine | → **composition** (`toolRunner`, `RetryingAgent`) |

---

**BASIC LANGUAGE GAP I FACED IS:** in Python, tools could be simply defined in a pure Python fx, and Python allows us to extract the metadata related to the fx, for eg its parameter types, its docstring etc! So we could build a function class where we could build the tool definition for the agent at runtime. But we cannot do that in TS, because first, all the types will be gone at compile time, even comments, right!

So we must make sure the DEVELOPER that is using this library defines it in such a way that we don't have to handle the metadata, because again, they will be gone at compile time!

Using **ZOD**! (because Zod checks exist at runtime)

So to facilitate this, we want that the user just defines the tool with the object, and we handle it on our side!

---

## #5

**What is the difference between an abstract class vs an interface in TypeScript?**

Well, you could restrict a class's methods and everything by defining either an interface or an abstract class for it. But an abstract class does exist at runtime, and along with the rules (same as interface) restriction, you can also add methods in it which could be shared in its child classes. So an abstract class could have methods that could be shared in its child classes, and can also implement abstract methods, allowing the child classes to implement their own execution.

> **→ Bonus!** I was also confused about the `protected` keyword in the class. `protected` allows the parent class variable access only in its child class!
>
> For eg, let's say you defined a `name` in the parent class as a protected variable. Then that name could be used in a class extending the parent class as `this.name`, but that name won't be accessible in the object of that child class!
>
> So if the `memoryManager` is going to get used as a composition in the agent class, pvt or protected won't matter. But if we, let's say, wish to extend the functionalities of the `memoryManager`, then we must make sure the variables are protected, so that extending that class would allow us to use them in the parent class, and thus we could manipulate the variables in the `memoryManager` (message variable).

---

## #5

It's hard to decide what object interface your agent memory should follow, because initially I decided to have an `id`, `content` and the `timeStamp`.

But obviously, if you wish to have a nice agent which is very efficient in retrieving the right info, then you must know some **FACTS**. For eg, an agent memory must preserve **who** a memory belongs to and **where** it applies? So you must know the user ID, agent ID and the runId/session ID it could be used in!

Now, only if I had known this fact, I would have designed the schema in a different and better way! So to get these facts, I started reading blogs on how to understand the agent memory.

---

## #6

Since the memory class was going as a composition, how to understand if the class is becoming overwhelming? Introduce a manager for that!

I didn't know much about **facade**, but now I know. Since the memory manager needs to give the right ctx to the agent layer, it will be calling its short-term memory methods, long-term, and what not! (we will explore it later) And this will get the agent layer into a lot of trouble, to call `memory.A()` and then `memory.B()` etc.

Instead, we will just introduce a pattern ka **facade**, where it will be passed as a composition to the agent layer! So that our client doesn't know shit about the subsystems!

So we will call that a **memory manager**!

---

## #7

I personally liked this issue, because this was solved using the **strategy pattern**, something I thought I knew! So basically, I was planning to again make the memory manager have short-term and long-term classes as a composite only.

Now the issue is: if in this case I make this, the memory manager has to be opened and changed, or probably introduced to have a new obj of storage! Right?

So this is the issue: I don't wanna touch the `memoryManager`, as this is going to be very fragile. If you want the reason, or just for now, take it as an assignment: how could you stop the `memoryManager` from being editable after a new method of short strategy!

---

## #8

Again, not sure if I had written it somewhere above or not, but I was facing an issue in finalizing the interface for the memory layer. I did some chatting with Claude, and I got to know we shouldn't finalize the interface inwards-out.

---

## #9

One thing worth noticing is something I did explicitly. If you notice the tool runner class, it is just a class which implements an **INTERFACE**, i.e. `IToolRunner`. Now I could also do the same for the memory layer, but I deliberately made the `MemoryManager` (facade) an **abstract class**, and not in the class + interface style.

---

## #10

I was writing the `memoryTool` and I almost forgot that we need to write…

---

## #11

**Shit started getting real!** Now I need to understand how to incorporate a middleware library for all the agents. The book doesn't describe much about middleware in that depth.

After learning through the internet, I have realized my middleware should be extendable enough that if I wish to add any new power to the agent request, I could just be able to do that by inserting a new function, without wasting much time changing the architecture from scratch! That brings us to our next question:

**What is the LLD of our middleware?** We gotta figure it out; will also validate the design with Opus to make sure I am not messing it up!

So the first thing I need to decide is the **OBJ interface** that I will be passing to all our possible middleware fx, which will be flexible enough that our future middleware fx will also be able to use it!

So the very first param I could think of is the **USER REQUEST**, or the exact query that will be used as a prompt for the LLM call. Now with that, I mean the exact object that is passed to the LLM, having the memory / history / conversations / userQuery / toolCallResult / totalTools / outputGenerated. Output generated also, because to handle those middleware fx which will exist after the LLM response!

These are what I am able to think of now:

```
{
    userQuery:
    history:
    memory:
    toolCallResult:
    Tools:
    Output:
}
```

The above object could be summed into the `LLMInput` type we already have, and the output will be `AgentResponse`. So our new object, or context, that I should be passing to each middleware fx is:

```ts
ctx = {
  request:  LLMInput,
  response: AgentResponse | null,
  ... any more keys if required for different middleware
}
```

And also, I am missing the more important point of middleware, that is THE very basic, and that is **authentication**. So we also need to add the `sessionId`, `userId`, `iteration`, `signal`/cancellation and `state` for some reason.

**SO THE VERY FIRST FIVE MIDDLEWARES I WOULD WANT ARE:**

1. RETRY
2. tokenLogger
3. guardrail
4. cache
5. rate limit

---

## #12 – Interface design notes

**HIGH LEVEL DESIGN OF INTERFACE**

- agentInput
  - LLMInput
    - toolInput
    - memoryInput
- agentOutput/response
  - LLMOutput
    - toolOutput
    - memoryManagerOutput
- agentInitialization
  - agentParams (tools, memory, middleware, etc)

**BLOCK LEVEL DESIGN OF INTERFACE**

- middlewareContext
- agentEvent
- historyMessage

**QUESTIONS**

1. WHAT ARE THE GLOBAL TYPES, which will never change in this repo?
2. High-level interface should be designed first, to make sure it covers everything being used downstream!

These were the doubts. For that, I read a few blogs. Here are my findings:

- **Parser better than validator**, so always parse the data after validating it.

I had a prototype for this, but then I used Claude for this part, as I was not getting much time on this part to build! (just see the [agentTypes.png](../agentTypes.jpg) at the root level)

---

## Implementing middleware

**IMPLEMENTING MIDDLEWARE** was the most exciting part, and a bit challenging for me, since I had to implement a `middlewareChain` execute-stream method as well, for which I obviously had zero idea. So I first read about it, even published a small tldraw over it on my LinkedIn, of writing this method from scratch, and now I understand better.

Now I will be implementing middlewares and will add them in the middlewares array in the `middlewareChain` class. Kinda **chain of responsibility pattern** with handler and next: handler here means each middleware, and next is the callback that each middleware has!

Check out this LINK → <https://www.tldraw.com/p/UNgK7x5vdBDRD9IH3UuG_?d=v-2294.-554.6656.3984.page>

---

## Span object

**THE next step** after implementing our `middlewareChain` was to integrate the **OpenTelemetry middleware**. Now, to understand this, you must get what the heck a **span obj** is! BECAUSE the book I was following was simply suggesting span bla bla!

So I read about it. Basically, a span is just an object which you could give a name, and when you end a span, it remembers the duration time! For eg, see the below pseudo code:

```ts
class testSpan {
    name,
    startTime=time.now()
    duration

    constructor(name){
        this.name=name
        this.startTime
        return span created for name ,this.name!
    }
    end (){
        return this.startTime-this.time.now()
    }

}
```

Now I had difficulty understanding also about **when** the span obj should actually live! Firstly, I thought it should live with each middleware instance, and let's just add this span object into the `baseMiddleware` pvt variable. But **WRONG**! A span is associated with each process! Why the heck should a span carry the time from the moment any middleware instance got created? It should only exist when middleware methods are called! Because they will only be called when they are required! And it is exactly then only that we should make the span object alive!

**SO WHERE EXACTLY SHOULD YOU store the span obj?** I even thought of storing it in the `middlewareChain` class, but then each time it will execute a set of middlewares of different calls, it will overwrite the last span obj! So it should stay per request! That is, in the params of the `middlewareContext`! Because for each model call, that is going to be different, right! And also, AI helped me here, so we will add a key `metaData` in the `middlewareContext`, which will hold the span obj for each call!

---

## Gemini provider

Not sure this should be in the difficulty.md, but I had to integrate another provider to test: **Gemini**. I felt lazy going over their docs, so I just asked Claude to write the provider for me lol, also to wire up this mini agent library into a `test.js`! To check if everything's working for me now!!

**I HAVE ignored testing my telemetry system** with Jaeger or Grafana etc! Will do it later `@UPDATE`. But the important part was to understand the Span object, and how we can assign it in the request and response cycle to actually use it to capture/calculate any event!

---

## Agent as Tools

**THE NEXT code challenge is about producing agent as Tools!**

This is basically:

- the tool's name = `agent.name`
- the tool's desc = `agent.description`
- the `tools.execute` = becomes the `agent.run` / and run stream method!

This is what my **first-principle approach** tells me! And even, let's say, if I face some issue, I will just implement an **adapter** for it, to allow the agent to act as a tool!

Also, at this point I just want to highlight that we don't have any base class for the tool definition! We just have the `ITool` definition for any tools to follow this convention!
