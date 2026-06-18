#First difficulty i faced was how to create the right abstraction layer ,for eg should i make the client in the llmProvider abstract class or should i implement it in the concrete classes !

#2-too many addition and changing in the parameter of the create fx of the llmprovider ! so i just created an llmInput type ! -->but then again i shouldnt have make it for the create fx!

#3-how to handle the output with structured schema enabled ! ,currenlty having a flag to allow the agent api call to generate the output in structured format ,for eg if you use interface its a compile time type check,it doesnt exist at the runtime,so to validate the user inputs at the runtime its necessary you involve some runtime validator which is our ZOD !

#4 struggling to define a unified schema for the toolexecute fx ! 
-response{
    message:"content"
    toolName:"websearchtool"
    previousMessage:"message which invoke the tool Call "
    toolDescription:"maybe not so important"
}

#importantNote -I just realized how to stop  getting confused ,for that always assume that whatever the object is comming from the provider layer it must be formatted according to our enigma agent 
but there is a catch initially i was thinking that if i could make a helper fx that will format the llm response(when i say llm response means raw response from the provider layer) and we can directly send the response from our agent layer but it was so wrong !
-first we should just have followed the adapter pattern ,as the provider raw response could be different for each provider ,so instead of having a one unified funciton we should just have a private function for each ! provider,though i was following the switch case

