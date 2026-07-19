import json
from graph.database import db

db.connect()

nodes = db.query("MATCH (n:Entity) RETURN n.id as id, n.name as name")
rels = db.query("MATCH (s:Entity)-[r:RELATION]->(o:Entity) RETURN s.name as source, type(r) as predicate, o.name as target, r.reasoning as reasoning")

with open("/Users/apple/.gemini/antigravity-ide/brain/a3a213cd-523b-424b-afc0-fb3d51ca48f3/neo4j_test_results.md", "w") as f:
    f.write("# Neo4j Test Data Extraction Results\n\n")
    f.write("This is the exact data pulled from your Aura DB instance (`b06b97af`) after the background processing with `gemma4:12b-48k`.\n\n")
    
    f.write("## Extracted Nodes\n")
    f.write("| ID | Name |\n")
    f.write("|---|---|\n")
    for n in (nodes or []):
        f.write(f"| {n['id']} | {n['name']} |\n")
        
    f.write("\n## Extracted Relationships & Reasoning\n")
    f.write("| Source | Predicate | Target | Reasoning |\n")
    f.write("|---|---|---|---|\n")
    for r in (rels or []):
        f.write(f"| {r['source']} | {r['predicate']} | {r['target']} | {r['reasoning']} |\n")

print("Dumped successfully")
