# Todos

1. Create your cortex class from which you could import Agents and modelProvider code to make llm api call
   - e.g. `from picoagents import Agents, OpenAiChatCompletion`

#Learning
2-You should have an idea about how the agent prepares the execution context,what data it needs to
have in its run call before finally sending it to the ai provider -agents system prompt + prev history msg + currentTask

<!-- Add more todos below this line -->
3-Implement the structure output key in the agent response

4-So to add any tool responnse in our agent we must first understand that we use a unified agent response approach
our agent class shouldnt be dealing with the tool response logic and everything so we manually need to 
format the llm providers response ! and send it in a unified way from our agent (check the helper.ts ,formatAgentResponse() ) ,that function has a switch case and executes different way of formating to handle the logic

to integrate the tool we must need to understand that we need a place
where we could define a tool,
then we need to format the llm response such that the agent could request for the tool Response !
and then we need to execute the tool with the right parameters
and then finally we need to send the output to the agent response !
now to actually implement all these steps we first need to understand the how we should actually get the output of the execute tool(figure out the format?)
