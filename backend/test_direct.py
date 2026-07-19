import asyncio
from ingestion.processor import processor
from graph.database import db

async def run_test():
    with open("test_data.txt", "rb") as f:
        file_bytes = f.read()
    print("Processing document synchronously...")
    await processor.process("test_data.txt", file_bytes, "test-doc-id")
    print("Processing complete.")
    
    db.connect()
    nodes = db.query("MATCH (n:Entity) RETURN n.id, n.name")
    print("Nodes in DB:", nodes)
    
    rels = db.query("MATCH (s:Entity)-[r:RELATION]->(o:Entity) RETURN s.name, type(r), o.name, r.reasoning")
    print("Relations in DB:", rels)

if __name__ == "__main__":
    asyncio.run(run_test())
