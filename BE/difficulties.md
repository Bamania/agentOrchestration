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

#I was making a toolRunner class as a helper fx with lot of if and else statement ,due to which i was not following the ocp principle ! so each time i had to get a new tool i had to go the helper function and add a new switch statement,so better method was to build a registry ! and then pass the toolRunner(with all the tool installed) ans-we should imagine a class and its behaviours like,for eg a agent concrete class will have a tool runner , memory manager maybe?, etc etc,instead of having a pure functions for the agent we could just make a new class and pass its instance to the concrete class in the runtime ! thats composite for you 


 to each agent,so that whenever agent get the llm response asking for the tool execution since the agent now also has the tool Runner object it will also be able to call the required tool using its execute fx !

 LEARNING->
 The mnemonic
is-a, share a skeleton, one family tree, stable base → inheritance (SimpleAgent)
has-a, swap at runtime, vary on many axes, wrap/combine → composition (toolRunner, RetryingAgent) 


BASIC LANGUAGE GAP I FACED IS ,in python tools could be simply defined in a pure python fx,and since pythona allows us to extract the metadata realted to the fx for eg its parameters type,its doc string etc ! so we could build a function class where we could build the tool defination for the agent in the runtime ,but we cannot do that in the ts,because first all the types will be gone in the compile time ,even comments right !
so we must make sure the DEVELOPER that is using this library define it in such way that we dont have to handle the metadata because again they will be gone in the compile time !
using ZOD ! (because zod checks exist at the runtime)

so to facilate this we want that user just 
define the tool with the object and we handle it on our side !

#5 What is the difference between an abstract class vs an interface in typescript !
well you could restrict a class methods and everything by defining either an interface or abstract class for it,but abstract class does exist in runtime and along with rules (same as interface ) restriction you can also add method in this which could be shared in its child classes ,so an abstract class could have method that could be shared in its child class and can also implement abstract method allowing the child class to implement their own execution

->Bonus ! I was also confused about the protected keyword in the class,protected allows the parent class variable access only in their child class ! for eg 
lets say you defined a name in the parent class as protected variable ,then that name could be used in a class extending the parent class as 
this.name but that name wont be accessible in the object of that child class ! 
So if the memoryManager is going to get used as a composition in the agent class pvt or protected wont matter,but if we lets say wish to extend the functionalities of the memoryMAnager then we must make sure the variables are protected so that extending that class would allow us to use in the parent class and thus we could
manipulate the variables in the memoryManager(message variable) 
