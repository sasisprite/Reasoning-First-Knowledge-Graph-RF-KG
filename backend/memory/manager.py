class MemoryManager:
    def __init__(self):
        # In a real app this would be tied to session_id, for POC it's global memory
        self.history = []
        self.retrieved_context = []

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        # Keep only recent history
        if len(self.history) > 10:
            self.history = self.history[-10:]

    def get_history(self) -> list:
        return self.history

    def set_context(self, context: list):
        self.retrieved_context = context

    def get_context(self) -> list:
        return self.retrieved_context

    def clear(self):
        self.history = []
        self.retrieved_context = []

memory = MemoryManager()
