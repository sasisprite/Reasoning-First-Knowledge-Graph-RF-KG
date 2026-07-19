from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import routes
from graph.schema import init_schema

app = FastAPI(title="Reasoning-First Knowledge Graph (RF-KG)", version="0.1")

@app.on_event("startup")
async def startup_event():
    init_schema()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)

@app.get("/")
def read_root():
    return {"message": "RF-KG API is running"}
