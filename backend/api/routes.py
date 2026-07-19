from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from ingestion.processor import processor
from agents.conversation_agent import conversation_agent
from graph.database import db
from pydantic import BaseModel
import uuid

router = APIRouter()

processing_status = {}

import datetime

def process_and_update(filename, file_bytes, doc_id):
    try:
        result = processor.process(filename, file_bytes, doc_id)
        processing_status[doc_id] = {
            "status": "completed",
            "filename": filename,
            "message": "Processing finished successfully.",
            "overall_summary": result.get("overall_summary", ""),
            "entities": result.get("entities", []),
            "relationships": result.get("relationships", [])
        }
    except Exception as e:
        processing_status[doc_id] = {"status": "error", "filename": filename, "message": str(e)}
        try:
            db.query("MERGE (d:Document {id: $id}) SET d.status = 'failed'", {"id": doc_id})
        except Exception as db_err:
            print(f"Failed to update document status to failed in DB: {db_err}")

@router.post("/documents")
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    file_bytes = await file.read()
    
    processing_status[doc_id] = {
        "status": "processing",
        "filename": file.filename,
        "message": "Extracting reasoning and building graph..."
    }
    
    # Run processing in background so API returns quickly
    background_tasks.add_task(process_and_update, file.filename, file_bytes, doc_id)
    
    return {"status": "ok", "message": "Processing started", "document_id": doc_id}

@router.get("/documents")
async def get_documents():
    db.connect()
    # Query documents list ordered by created_at DESC (if created_at is present, fallback to filename)
    docs_res = db.query(
        "MATCH (d:Document) "
        "RETURN d.id AS id, d.filename AS filename, d.summary AS summary, d.status AS status, toString(d.created_at) AS created_at "
        "ORDER BY d.created_at DESC"
    )
    
    history = []
    completed_ids = set()
    for doc in (docs_res or []):
        doc_id = doc["id"]
        completed_ids.add(doc_id)
        
        # Fetch relationships for this document
        rels_res = db.query(
            "MATCH (s:Entity)-[r:RELATION]->(o:Entity) WHERE r.document_id = $doc_id "
            "RETURN s.id AS subject, r.predicate AS predicate, o.id AS object, r.reasoning AS reasoning",
            {"doc_id": doc_id}
        )
        
        # Fetch distinct entities associated with relationships in this document
        ents_res = db.query(
            "MATCH (e:Entity)-[r:RELATION]-() WHERE r.document_id = $doc_id "
            "RETURN DISTINCT e.id AS id, e.name AS name, e.type AS type",
            {"doc_id": doc_id}
        )
        
        rels_list = [{"subject": r["subject"], "predicate": r["predicate"], "object": r["object"], "reasoning": r["reasoning"]} for r in (rels_res or [])]
        ents_list = [{"id": e["id"], "name": e["name"], "type": e["type"]} for e in (ents_res or [])]
        
        # Determine status
        raw_status = doc.get("status") or "completed"
        if raw_status == "processing":
            status_str = "error"
        elif raw_status == "failed" or raw_status == "error":
            status_str = "error"
        else:
            if len(rels_list) == 0 and len(ents_list) == 0:
                status_str = "error"
            else:
                status_str = "done"
        
        history.append({
            "docId": doc_id,
            "name": doc["filename"],
            "date": doc.get("created_at") or datetime.datetime.now().isoformat(),
            "status": status_str,
            "overall_summary": doc.get("summary") or "No summary available.",
            "entities": ents_list,
            "relationships": rels_list
        })
        
    # Also add any currently active/processing status entries that aren't saved in DB yet
    for doc_id, info in processing_status.items():
        if doc_id not in completed_ids:
            history.append({
                "docId": doc_id,
                "name": info.get("filename") or "Unknown file",
                "date": datetime.datetime.now().isoformat(),
                "status": info.get("status", "processing"),
                "overall_summary": info.get("overall_summary", ""),
                "entities": info.get("entities", []),
                "relationships": info.get("relationships", [])
            })
            
    return history

@router.get("/documents/{doc_id}/status")
async def get_document_status(doc_id: str):
    return processing_status.get(doc_id, {"status": "not_found", "message": "Document not found."})

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(req: ChatRequest):
    result = conversation_agent.chat_structured(req.message)
    return {"status": "ok", **result}

@router.get("/graph")
async def get_graph():
    db.connect()
    # Fetch actual totals from Neo4j
    total_nodes_res = db.query("MATCH (n:Entity) RETURN count(n) AS c")
    total_links_res = db.query("MATCH ()-[r:RELATION]->() RETURN count(r) AS c")
    total_nodes = total_nodes_res[0]["c"] if total_nodes_res else 0
    total_links = total_links_res[0]["c"] if total_links_res else 0

    # Fetch nodes and edges for the graph visualization (higher limit)
    nodes_res = db.query("MATCH (n:Entity) RETURN n.id AS id, n.name AS name, n.type AS group LIMIT 800")
    links_res = db.query("MATCH (s:Entity)-[r:RELATION]->(o:Entity) RETURN s.id AS source, o.id AS target, type(r) AS value, r.reasoning AS reasoning LIMIT 800")
    
    nodes = [{"id": row["id"], "name": row["name"], "group": row["group"]} for row in (nodes_res or [])]
    links = [{"source": row["source"], "target": row["target"], "value": row["value"], "reasoning": row["reasoning"]} for row in (links_res or [])]
    
    return {
        "nodes": nodes,
        "links": links,
        "total_nodes": total_nodes,
        "total_links": total_links
    }

import yaml
from pathlib import Path
from config.settings import models_config

@router.get("/config")
async def get_config():
    return models_config

@router.post("/config")
async def save_config(new_config: dict):
    config_path = Path("config/models.yaml")
    with open(config_path, "w") as f:
        yaml.dump({"models": new_config}, f, default_flow_style=False)
    # Update running config
    models_config.update(new_config)
    return {"status": "ok", "message": "Config saved successfully"}
