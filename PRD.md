# Reasoning-First Knowledge Graph (RF-KG)
## Proof of Concept (POC) Product Requirements Document

Version: 0.1

---

# 1. Vision

Reasoning-First Knowledge Graph (RF-KG) is a lightweight AI system that demonstrates a new approach to retrieval.

Instead of retrieving document chunks like traditional RAG, RF-KG stores structured knowledge together with the reasoning that explains why relationships exist.

The objective is to show that semantic reasoning attached to graph relationships produces more explainable and context-aware retrieval.

This is a Proof of Concept only.

The focus is:

- Simple architecture
- Fast implementation
- Modular design
- Easy experimentation
- Easy model replacement

This project is **not** intended for production deployment.

---

# 2. Objectives

Build a lightweight application capable of:

✓ Uploading documents

✓ Extracting entities

✓ Extracting relationships

✓ Generating reasoning for every relationship

✓ Building a Neo4j Knowledge Graph

✓ Storing vector embeddings

✓ Searching using reasoning

✓ Answering questions from graph context

✓ Visualizing graph interactively

---

# 3. High-Level Architecture

```

                    +----------------------+
                    |      React UI        |
                    +----------+-----------+
                               |
                               |
                     Conversation Agent
                               |
              +----------------+----------------+
              |                                 |
         Memory Manager                 Retrieval Agent
                                                |
                                         Knowledge Graph
                                                |
                                 Neo4j + Vector Index
                                                |
                                  Document Processor
                                                |
                         Parser → Chunk → Extract → Store

```

---

# 4. Scope

Included

- PDF upload

- DOCX upload

- Plain text upload

- Chunking

- Entity extraction

- Relationship extraction

- Reasoning generation

- Embedding generation

- Neo4j storage

- Retrieval Agent

- Conversation Agent

- D3 Graph

Not Included

- Authentication

- RBAC

- Multi-user

- Incremental indexing

- Distributed processing

- Workflow engine

- Multi-agent planning

- Production deployment

---

# 5. Technology Stack

Backend

- Python

- FastAPI

Frontend

- React

- Vite

- D3.js

Database

- Neo4j Aura Free

Embedding

- OpenRouter
or
- Local Sentence Transformers

LLM

Only through OpenRouter Adapter

---

# 6. Repository Structure

```

rfkg/

backend/

api/

agents/

config/

graph/

ingestion/

llm/

memory/

retrieval/

frontend/

shared/

docs/

```

---

# 7. Configuration

Nothing should be hardcoded.

Everything should be configurable.

Example

config/models.yaml

```yaml

models:

 extraction:
 provider: openrouter
 model: google/gemini-2.5-flash

 reasoning:
 provider: openrouter
 model: openai/gpt-4.1-mini

 conversation:
 provider: openrouter
 model: openai/gpt-4.1

 embedding:
 provider: openrouter
 model: text-embedding-3-small

```

Changing a model must never require code changes.

---

# 8. Document Processing Pipeline

```

Upload

↓

Parser

↓

Text Normalizer

↓

Semantic Chunker

↓

Rolling Context

↓

Entity Extraction

↓

Relationship Extraction

↓

Reasoning Generation

↓

Embedding

↓

Neo4j

```

---

# 9. Rolling Context

Instead of processing the entire document at once:

Chunk 1

↓

Generate SPO

↓

Generate Reasoning

↓

Generate Summary

↓

Pass Summary into Chunk 2

↓

Repeat

This allows the model to retain context across chunks while keeping prompts small.

---

# 10. Knowledge Graph Schema

## Entity

```

id

name

type

summary

```

---

## Relationship

```

subject

predicate

object

reasoning

reasoning_embedding

chunk_id

document_id

```

---

## Chunk

```

id

document

text

page

```

---

# 11. Reasoning

Every relationship must include a reasoning field.

Example

```

Apple

ACQUIRED

NeXT

Reason:

The acquisition enabled Apple to bring Steve Jobs back and use NeXTSTEP as the foundation for macOS.

```

Reasoning should remain below 50 tokens.

---

# 12. Embeddings

Embeddings are generated only for:

Reasoning

Optional:

Chunk text

Entity summary

Reasoning embeddings will drive retrieval.

---

# 13. Neo4j Storage

Nodes

```

(:Entity)

```

Relationships

```

(:Entity)-[:RELATION]->(:Entity)

```

Relationship Properties

```

predicate

reasoning

embedding

chunk

document

```

---

# 14. Retrieval Pipeline

```

User Question

↓

Embedding

↓

Vector Search

↓

Top K Relationships

↓

Expand Graph

↓

Collect Chunks

↓

Build Context

↓

Conversation Agent

↓

Answer

```

The retrieval focuses on reasoning embeddings instead of chunk embeddings.

---

# 15. Conversation Agent

Responsibilities

- Receive user question

- Call Retrieval Agent

- Receive graph context

- Generate final response

- Maintain conversation history

Conversation memory is session-only.

No long-term user memory.

---

# 16. Memory

Store only:

Conversation History

Recent Questions

Recent Retrieved Nodes

Recent Retrieved Relationships

Memory resets when session ends.

---

# 17. LLM Gateway

All model access passes through one interface.

```

Conversation Agent

↓

LLM Gateway

↓

OpenRouter Adapter

↓

Selected Model

```

Future adapters may include:

OpenAI

Anthropic

Gemini

Ollama

without changing application code.

---

# 18. REST APIs

## Upload Document

POST

```

/documents

```

---

## Process Document

POST

```

/documents/{id}/process

```

---

## Query

POST

```

/query

```

---

## Chat

POST

```

/chat

```

---

## Graph

GET

```

/graph

```

---

## Node

GET

```

/graph/node/{id}

```

---

# 19. Frontend

Four lightweight screens.

## Upload

Upload PDF

Show processing progress

---

## Graph

Interactive D3 Graph

Click node

Highlight neighbors

Click relationship

Open reasoning panel

---

## Chat

Chat interface

Displays answer

Shows source nodes

---

## Configuration

Choose

Extraction Model

Reasoning Model

Embedding Model

Conversation Model

---

# 20. Success Criteria

The POC is successful when a user can:

1.

Upload a PDF.

↓

2.

System extracts entities.

↓

3.

System extracts relationships.

↓

4.

System generates reasoning.

↓

5.

Knowledge graph is built.

↓

6.

User asks:

"Why did Apple acquire NeXT?"

↓

7.

Retrieval Agent finds reasoning edges.

↓

8.

Conversation Agent answers using:

- Graph
- Reasoning
- Original chunk

↓

9.

UI highlights the graph path used for the answer.

---

# 21. Future Enhancements

- Multi-hop reasoning

- Graph merging

- Temporal graphs

- Contradiction detection

- Graph evolution

- Multiple document collections

- Multi-agent reasoning

- Hybrid SQL + Graph retrieval

---

# 22. Deliverables

Backend

✓ FastAPI

✓ Neo4j integration

✓ OpenRouter Adapter

✓ Document Processor

✓ Retrieval Agent

✓ Conversation Agent

Frontend

✓ Upload Page

✓ Chat Page

✓ D3 Graph

✓ Reasoning Panel

Configuration

✓ YAML model configuration

✓ Environment variables

Documentation

✓ README

✓ Setup Guide

✓ Sample Documents

✓ Architecture Diagram

---

# End of POC PRD