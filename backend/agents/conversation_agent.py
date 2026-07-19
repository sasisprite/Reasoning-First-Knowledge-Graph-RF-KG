from llm.gateway import llm_gateway
from agents.retrieval_agent import retrieval_agent
from memory.manager import memory


class ConversationAgent:
    def chat_structured(self, user_message: str) -> dict:
        """
        Returns structured response:
        {
            "mapped_terms": [...],
            "nodes": [...],
            "relationships": [...],
            "synthesis": str,
            "response": str,
            "entities": [...]
        }
        """
        # 1. Structured retrieval from graph
        retrieval = retrieval_agent.retrieve_structured(user_message)

        # 2. Build context for final answer
        context_lines = []
        for r in retrieval["relationships"][:6]:
            context_lines.append(
                f"- {r['subject']} → {r['predicate']} → {r['object']}: {r['reasoning']}"
            )
        context_str = "\n".join(context_lines) if context_lines else "No graph context found."

        system_prompt = (
            "You are a Knowledge Graph assistant. Give a short, structured answer (max 3 sentences or bullet points). "
            "Base your answer ONLY on the graph context provided. Do not use external knowledge.\n\n"
            f"Graph Context:\n{context_str}"
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(memory.get_history()[-6:])  # Last 3 exchanges
        messages.append({"role": "user", "content": user_message})

        # 3. Call LLM for final answer
        try:
            response = llm_gateway.generate_conversation(messages)
        except Exception as e:
            response = retrieval["synthesis"] or "Could not generate answer from graph context."

        # 4. Update memory
        memory.add_message("user", user_message)
        memory.add_message("assistant", response)

        return {
            "mapped_terms": retrieval["mapped_terms"],
            "nodes": retrieval["nodes"],
            "relationships": retrieval["relationships"],
            "synthesis": retrieval["synthesis"],
            "response": response,
            "entities": [n["name"] for n in retrieval["nodes"][:6]]
        }

    def chat(self, user_message: str) -> str:
        """Legacy simple chat for backward compatibility."""
        result = self.chat_structured(user_message)
        return result["response"]


conversation_agent = ConversationAgent()
