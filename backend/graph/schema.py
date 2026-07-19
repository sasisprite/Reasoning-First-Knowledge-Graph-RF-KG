from graph.database import db

from config.settings import models_config

def init_schema():
    dim = models_config.get("embedding", {}).get("dimensions", 768)
    # Create constraints and vector indexes
    queries = [
        "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE",
        "DROP INDEX reasoning_embedding IF EXISTS",
        f"CREATE VECTOR INDEX reasoning_embedding IF NOT EXISTS FOR ()-[r:RELATION]-() ON (r.reasoning_embedding) OPTIONS {{indexConfig: {{`vector.dimensions`: {dim}, `vector.similarity_function`: 'cosine'}}}}"
    ]
    db.connect()
    for q in queries:
        try:
            db.query(q)
        except Exception as e:
            print(f"Warning: schema init failed (might not be supported on this neo4j version): {e}")
