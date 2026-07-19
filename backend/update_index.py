from graph.database import db

db.connect()
try:
    db.query("DROP INDEX reasoning_embedding IF EXISTS")
    db.query("CREATE VECTOR INDEX reasoning_embedding IF NOT EXISTS FOR ()-[r:RELATION]-() ON (r.reasoning_embedding) OPTIONS {indexConfig: {`vector.dimensions`: 2048, `vector.similarity_function`: 'cosine'}}")
    print("Vector index recreated for 2048 dimensions.")
except Exception as e:
    print("Failed:", e)
