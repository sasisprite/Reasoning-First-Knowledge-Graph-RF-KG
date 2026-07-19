import requests
import time
import sys
import os

BASE_URL = "http://localhost:8000"

def wait_for_server():
    print("Waiting for server...")
    for _ in range(30):
        try:
            r = requests.get(BASE_URL + "/")
            if r.status_code == 200:
                print("Server is up!")
                return True
        except:
            time.sleep(1)
    print("Server failed to start")
    return False

def test_upload():
    print("Uploading test document...")
    with open("test_data.txt", "rb") as f:
        r = requests.post(BASE_URL + "/documents", files={"file": f})
    print("Upload response:", r.json())
    return r.json().get("document_id")

def test_chat(message):
    print(f"Chatting: {message}")
    r = requests.post(BASE_URL + "/chat", json={"message": message})
    print("Chat response:", r.json())

def test_graph():
    print("Fetching graph...")
    r = requests.get(BASE_URL + "/graph")
    print("Graph data:", r.json())

if __name__ == "__main__":
    if not wait_for_server():
        sys.exit(1)
        
    print("Testing initial graph...")
    test_graph()
    
    test_upload()
    
    print("Waiting for background processing (20s)...")
    time.sleep(20)
    
    print("Testing graph after upload...")
    test_graph()
    
    test_chat("Who acquired DeepMind?")
    test_chat("Who founded Google?")
