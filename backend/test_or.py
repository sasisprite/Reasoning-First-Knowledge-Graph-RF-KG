import requests
import os

key = os.getenv("OPENROUTER_API_KEY")
headers = {"Authorization": f"Bearer {key}"}

# Test chat
try:
    print("Testing chat...")
    res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json={
        "model": "meta-llama/llama-3.3-70b-instruct",
        "messages": [{"role": "user", "content": "hi"}]
    })
    print(res.json()["choices"][0]["message"]["content"])
except Exception as e:
    print("Chat error:", e, res.text if 'res' in locals() else '')

# Test embedding
try:
    print("Testing embedding...")
    res = requests.post("https://openrouter.ai/api/v1/embeddings", headers=headers, json={
        "model": "nvidia/llama-nemotron-embed-vl-1b-v2:free",
        "input": "test text"
    })
    data = res.json()
    print("Embedding length:", len(data["data"][0]["embedding"]))
except Exception as e:
    print("Embed error:", e, res.text if 'res' in locals() else '')
