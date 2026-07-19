from graph.database import db
from llm.gateway import llm_gateway
import json


class RetrievalAgent:
    def retrieve_structured(self, query: str) -> dict:
        """
        Returns structured retrieval result:
        {
            "mapped_terms": [...],
            "nodes": [...],
            "relationships": [...],
            "synthesis": str
        }
        """
        try:
            query_embedding = llm_gateway.generate_embedding(query)
            db.connect()

            # Try vector search first
            results = db.query(
                """
                CALL db.index.vector.queryRelationships('reasoning_embedding', 10, $emb)
                YIELD relationship, score
                MATCH (s)-[relationship]->(o)
                RETURN s.name AS subject, s.id AS subject_id, s.type AS subject_type,
                       type(relationship) AS predicate,
                       o.name AS object, o.id AS object_id, o.type AS object_type,
                       relationship.reasoning AS reasoning, score
                ORDER BY score DESC
                """,
                {"emb": query_embedding}
            )
        except Exception as e:
            print("Vector search failed, falling back to keyword:", e)
            results = None

        # Keyword fallback: try multiple word combos
        if not results:
            words = query.split()
            results = []
            for word in words[:4]:
                if len(word) < 3:
                    continue
                rows = db.query(
                    """
                    MATCH (s:Entity)-[r:RELATION]->(o:Entity)
                    WHERE toLower(r.reasoning) CONTAINS toLower($q)
                       OR toLower(s.name) CONTAINS toLower($q)
                       OR toLower(o.name) CONTAINS toLower($q)
                    RETURN s.name AS subject, s.id AS subject_id, s.type AS subject_type,
                           type(r) AS predicate,
                           o.name AS object, o.id AS object_id, o.type AS object_type,
                           r.reasoning AS reasoning, 0.5 AS score
                    LIMIT 5
                    """,
                    {"q": word}
                ) or []
                results.extend(rows)

        results = results or []

        # Collect unique nodes
        node_map = {}
        for row in results:
            for key, id_key, type_key in [('subject', 'subject_id', 'subject_type'), ('object', 'object_id', 'object_type')]:
                nid = row.get(id_key) or row.get(key)
                if nid and nid not in node_map:
                    node_map[nid] = {
                        "id": nid,
                        "name": row.get(key, nid),
                        "type": row.get(type_key) or "Entity"
                    }

        nodes = list(node_map.values())
        relationships = [
            {
                "subject": row.get('subject', ''),
                "predicate": row.get('predicate', ''),
                "object": row.get('object', ''),
                "reasoning": row.get('reasoning', '')[:160] if row.get('reasoning') else ''
            }
            for row in results
        ]

        # Mapped terms: unique names from results
        mapped_terms = list({row.get('subject') for row in results} | {row.get('object') for row in results})[:8]

        # Synthesis: pure graph-based, from reasoning summaries
        synthesis = ""
        if relationships:
            synthesis_prompt = (
                f"User asked: \"{query}\"\n\n"
                "Based purely on these knowledge graph relationships, write a concise and clear answer "
                "(2-5 sentences). Do NOT use any external knowledge. "
                "Create a coherent synthesis from these facts only:\n"
            )
            for r in relationships[:6]:
                synthesis_prompt += f"- {r['subject']} {r['predicate']} {r['object']}: {r['reasoning']}\n"
            synthesis_prompt += "\nAnswer:"
            try:
                synthesis = llm_gateway.generate_reasoning(synthesis_prompt)
            except Exception as e:
                print("Synthesis failed:", e)
                synthesis = " | ".join([f"{r['subject']} → {r['object']}" for r in relationships[:3]])

        return {
            "mapped_terms": mapped_terms,
            "nodes": nodes,
            "relationships": relationships,
            "synthesis": synthesis
        }

    def retrieve(self, query: str) -> list:
        """Legacy simple retrieve for backward compatibility."""
        data = self.retrieve_structured(query)
        context = []
        for r in data["relationships"]:
            context.append(f"{r['subject']} {r['predicate']} {r['object']}. Reason: {r['reasoning']}")
        return context


retrieval_agent = RetrievalAgent()
