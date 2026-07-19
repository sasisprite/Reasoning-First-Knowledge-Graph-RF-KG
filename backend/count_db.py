from graph.database import db

db.connect()
nodes = db.query("MATCH (n:Entity) RETURN count(n) as c")[0]['c']
rels = db.query("MATCH (s:Entity)-[r:RELATION]->(o:Entity) RETURN count(r) as c")[0]['c']

print(f"Entities currently in DB: {nodes}")
print(f"Relationships currently in DB: {rels}")
