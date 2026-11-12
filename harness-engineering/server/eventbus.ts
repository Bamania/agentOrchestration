import { randomUUID } from "node:crypto";
import type { AgentEvent, EventInput, Emit } from "../shared/events/events.js";

// A tiny in-memory event bus. The harness emits events here; the WebSocket
// layer subscribes and forwards them to every connected inspector.
//
// We keep a short ring buffer so a browser that connects late still sees the
// timeline so far.

// Listeners are functios that return void at this point and they accept the AgentEvent
type Listener = (event: AgentEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>(); ///used set instead of map to mkae sure same Listener isnt added twice and allowing fast removal 
  private buffer: AgentEvent[] = []; //we will store the history of events as well so that whenever new clients is attached it knows all the history,to populate its local state or etc !
  private readonly max = 1000;
    //publishes to the listerns and also return the event that got published !
  emit(input: EventInput): AgentEvent {
    const event: AgentEvent = { ...input, id: randomUUID(), ts: Date.now() };
    this.buffer.push(event);
    if (this.buffer.length > this.max) this.buffer.shift();
    for (const listener of this.listeners){
        listener(event)
    }
    return event;
  }
  //add listeners
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  history(): AgentEvent[] {
    return [...this.buffer];
  }
}

// Hand harness code a plain `emit(...)` function bound to this bus.
export function createEmitter(bus: EventBus): Emit {
    //this input could bbe any type ! whatever we wish to pass into the listeners
  return (input) => {
    bus.emit(input);
  };
}