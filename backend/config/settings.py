import yaml
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    neo4j_uri: str = "neo4j+s://TODO:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "TODO"
    openrouter_api_key: str = "TODO"
    ollama_base_url: str = "http://localhost:11434"

    class Config:
        env_file = ".env"

settings = Settings()

def load_models_config():
    config_path = Path(__file__).parent / "models.yaml"
    if not config_path.exists():
        return {}
    with open(config_path, "r") as f:
        return yaml.safe_load(f).get("models", {})

models_config = load_models_config()
