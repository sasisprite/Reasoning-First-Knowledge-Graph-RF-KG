import requests
from graph.database import db

OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text:latest"

def get_embedding(text):
    try:
        response = requests.post(OLLAMA_URL, json={"model": EMBED_MODEL, "prompt": text})
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return [0.0] * 768

test_data = [
    {
        "subject": "Google",
        "predicate": "FOUNDED_BY",
        "object": "Larry Page",
        "reasoning": "Google was founded by Larry Page and Sergey Brin."
    },
    {
        "subject": "Google",
        "predicate": "ACQUIRED",
        "object": "DeepMind",
        "reasoning": "Google acquired DeepMind in 2014."
    }
]

db.connect()

print("Seeding database...")
for item in test_data:
    embedding = get_embedding(item["reasoning"])
    db.query(
        """
        MERGE (s:Entity {id: $subject, name: $subject, type: 'Organization'})
        MERGE (o:Entity {id: $object, name: $object, type: 'Person_or_Org'})
        MERGE (s)-[r:RELATION {predicate: $predicate}]->(o)
        SET r.reasoning = $reasoning, r.reasoning_embedding = $embedding
        """,
        {
            "subject": item["subject"],
            "object": item["object"],
            "predicate": item["predicate"],
            "reasoning": item["reasoning"],
            "embedding": embedding
        }
    )

print("Database seeded.")
print("Fetching graph...")
nodes = db.query("MATCH (n:Entity) RETURN n.id as id, n.name as name")
rels = db.query("MATCH (s:Entity)-[r:RELATION]->(o:Entity) RETURN s.name as source, type(r) as predicate, o.name as target, r.reasoning as reasoning")

print(f"Nodes: {nodes}")
print(f"Relationships: {rels}")
