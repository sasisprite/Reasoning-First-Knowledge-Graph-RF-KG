import requests
from config.settings import settings, models_config

class LLMGateway:
    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.openrouter_url = "https://openrouter.ai/api/v1"
        self.ollama_url = settings.ollama_base_url

    def _call_openrouter(self, model: str, messages: list):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": model,
            "messages": messages
        }
        response = requests.post(f"{self.openrouter_url}/chat/completions", headers=headers, json=data, timeout=15)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def _call_ollama(self, model: str, messages: list, format: str = None):
        data = {
            "model": model,
            "messages": messages,
            "stream": False
        }
        if format:
            data["format"] = format
        response = requests.post(f"{self.ollama_url}/api/chat", json=data, timeout=15)
        response.raise_for_status()
        return response.json()["message"]["content"]

    def _route_chat(self, config_key: str, messages: list, format: str = None) -> str:
        provider = models_config.get(config_key, {}).get("provider", "openrouter")
        model = models_config.get(config_key, {}).get("model", "")
        
        if provider == "ollama":
            return self._call_ollama(model, messages, format)
        else:
            return self._call_openrouter(model, messages)

    def generate_extraction(self, prompt: str) -> str:
        return self._route_chat("extraction", [{"role": "user", "content": prompt}], format="json")

    def generate_reasoning(self, prompt: str) -> str:
        return self._route_chat("reasoning", [{"role": "user", "content": prompt}])

    def generate_conversation(self, messages: list) -> str:
        return self._route_chat("conversation", messages)

    def generate_embedding(self, text: str) -> list:
        provider = models_config.get("embedding", {}).get("provider", "openrouter")
        model = models_config.get("embedding", {}).get("model", "")
        
        if provider == "ollama":
            data = {"model": model, "prompt": text}
            response = requests.post(f"{self.ollama_url}/api/embeddings", json=data, timeout=15)
            response.raise_for_status()
            return response.json()["embedding"]
        else:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            data = {"model": model, "input": text}
            response = requests.post(f"{self.openrouter_url}/embeddings", headers=headers, json=data, timeout=15)
            response.raise_for_status()
            return response.json()["data"][0]["embedding"]

llm_gateway = LLMGateway()
