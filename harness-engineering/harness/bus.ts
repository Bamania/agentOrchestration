import { randomUUID } from "node:crypto";
import type { AgentEvent, EventInput, Emit } from "../shared/events/events.js";
import { db, eventLog } from "./db.js";



// Listeners are functios that return void at this point and they accept the AgentEvent
type Listener = (event: AgentEvent) => void;
const listeners= new Set<Listener> ();  // listener means fx !
export function subscribe(listener:Listener){
    // we will add the listener in the callbacks
    listeners.add(listener)
    return ()=> listeners.delete(listener);
}

export async function emit (input:EventInput) : Promise<void>{
    const event:AgentEvent={...input,id:randomUUID(),ts:Date.now()};
    const timenow=Date.now();
    await db.insert(eventLog).values({data:event});
    console.log(`time took to inser event to db ${Date.now()-timenow}`);
    // once event is saved in the insert now fire up all the client with this event 
    for (const listener of listeners) listener(event);

}

export async function history():Promise<AgentEvent[]>{
    const rows=await db.select().from(eventLog).orderBy(eventLog.seq);
    return rows.map((rows)=>rows.data) // we just need the jsonBlob we have stored!
}