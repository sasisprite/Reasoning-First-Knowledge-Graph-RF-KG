from ingestion.parser import parser
from ingestion.chunker import chunker
from llm.gateway import llm_gateway
from graph.database import db
import json

class DocumentProcessor:
    def process(self, filename: str, file_bytes: bytes, document_id: str) -> dict:
        print(f"Parsing document {filename}")
        text = parser.parse(filename, file_bytes)
        chunks = chunker.chunk_text(text)
        
        context_summary = ""
        extracted_entities = {}
        extracted_relationships = []
        
        db.connect()
        # Create document node
        db.query("MERGE (d:Document {id: $id}) SET d.filename = $filename, d.status = 'processing', d.created_at = datetime()", {"id": document_id, "filename": filename})
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{document_id}_chunk_{i}"
            print(f"Processing chunk {i+1}/{len(chunks)}")
            # Extract Entities & Relationships
            prompt = f"""
            You are a comprehensive knowledge extractor. 
            Previous context summary: {context_summary}
            
            Extract all possible entities and relationships from the following text chunk. 
            Be thorough and capture as many meaningful connections as you can find. Do not be too strict—if there is a clear relationship between two entities, extract it.
            
            CRITICAL RELATIONSHIP INSTRUCTION:
            Avoid using generic predicates like 'RELATED_TO' or 'ASSOCIATED_WITH'. Instead, extract precise, domain-specific, meaningful ontology relationships that represent the action or association. 
            Examples of good predicates:
            - Business/Projects: 'DEPENDS_ON', 'PART_OF', 'WORKS_AT', 'MANAGED_BY', 'ACQUIRED', 'PARTNERS_WITH', 'COMPETES_WITH'
            - Concepts/Tech: 'IMPLEMENTS', 'INHERITS', 'EXTENDS', 'DEPRECATES', 'CAUSES', 'RESOLVES', 'INFLUENCES', 'LEADS_TO', 'USED_BY'
            - General: 'MEMBER_OF', 'LOCATED_IN', 'FOUNDED_BY', 'PUBLISHED_BY', 'AUTHOR_OF'
            Keep the predicates in uppercase (snake_case if multiple words, e.g. 'PART_OF').
            
            Return ONLY a valid JSON object with the following structure:
            {{
                "entities": [
                    {{"id": "EntityName", "name": "Entity Name", "type": "Person/Organization/Concept", "summary": "Brief description"}}
                ],
                "relationships": [
                    {{"subject": "Entity1_ID", "predicate": "RELATION_TYPE", "object": "Entity2_ID"}}
                ],
                "next_context_summary": "Brief summary of this chunk to pass to the next chunk"
            }}
            
            Text Chunk:
            {chunk}
            """
            
            try:
                extraction_res = llm_gateway.generate_extraction(prompt)
                # Cleanup JSON in case of markdown formatting
                extraction_res = extraction_res.replace("```json", "").replace("```", "").strip()
                data = json.loads(extraction_res)
                
                context_summary = data.get("next_context_summary", "")
                
                # Save Entities
                for ent in data.get("entities", []):
                    db.query(
                        "MERGE (e:Entity {id: $id}) SET e.name = $name, e.type = $type, e.summary = $summary",
                        ent
                    )
                    extracted_entities[ent["id"]] = {
                        "id": ent["id"],
                        "name": ent.get("name") or ent["id"],
                        "type": ent.get("type") or "Entity"
                    }
                
                # Generate Reasoning and Save Relationships
                for rel in data.get("relationships", []):
                    reasoning_prompt = f"Explain why {rel['subject']} {rel['predicate']} {rel['object']} based on this context: {chunk}. Keep it under 50 words."
                    reasoning = llm_gateway.generate_reasoning(reasoning_prompt)
                    
                    try:
                        embedding = llm_gateway.generate_embedding(reasoning)
                    except Exception as e:
                        print(f"Embedding failed: {e}")
                        embedding = []
                    
                    db.query(
                        """
                        MERGE (s:Entity {id: $subject})
                        MERGE (o:Entity {id: $object})
                        MERGE (s)-[r:RELATION {predicate: $predicate}]->(o)
                        SET r.reasoning = $reasoning, r.chunk_id = $chunk_id, r.document_id = $document_id, r.reasoning_embedding = $embedding
                        """,
                        {
                            "subject": rel["subject"],
                            "object": rel["object"],
                            "predicate": rel["predicate"],
                            "reasoning": reasoning,
                            "chunk_id": chunk_id,
                            "document_id": document_id,
                            "embedding": embedding
                        }
                    )
                    extracted_relationships.append({
                        "subject": rel["subject"],
                        "predicate": rel["predicate"],
                        "object": rel["object"],
                        "reasoning": reasoning
                    })
            except Exception as e:
                print(f"Error processing chunk {i}: {e}")
                
        # Update Document summary in DB
        db.query(
            "MERGE (d:Document {id: $id}) SET d.summary = $summary, d.status = 'completed', d.created_at = datetime()",
            {"id": document_id, "summary": context_summary or "No summary generated."}
        )
                 
        return {
            "overall_summary": context_summary or "No summary generated.",
            "entities": list(extracted_entities.values()),
            "relationships": extracted_relationships
        }

processor = DocumentProcessor()
