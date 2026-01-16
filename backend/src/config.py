"""Configuration settings for the podcast retrieval system."""

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env file from backend directory
_backend_dir = Path(__file__).parent.parent
load_dotenv(_backend_dir / ".env")


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Anthropic API
    anthropic_api_key: str = ""

    # OpenRouter API
    openrouter_api_key: str = ""

    # Qdrant (optional cloud settings)
    qdrant_url: Optional[str] = None
    qdrant_api_key: Optional[str] = None

    # OpenAI API
    openai_api_key: str = ""

    # Data directory override (for Docker deployments)
    data_dir_override: Optional[str] = None

    # Model settings
    embedding_model: str = "text-embedding-3-small"  # OpenAI model
    embedding_provider: str = "openai"  # "openai" or "local"
    reranker_model: str = "BAAI/bge-reranker-large"
    use_reranker: bool = True  # Cross-encoder reranking for better accuracy

    # Memory optimization
    bm25_lightweight_mode: bool = False  # If True, BM25 only loads index, not chunk metadata (~100MB savings)

    # Chunking settings
    max_chunk_tokens: int = 512
    min_chunk_tokens: int = 100
    chunk_overlap_tokens: int = 50

    # Retrieval settings
    dense_top_k: int = 15
    bm25_top_k: int = 15
    fusion_top_k: int = 20
    rerank_top_n: int = 15

    # Collection name
    collection_name: str = "podcast_chunks"

    @property
    def project_root(self) -> Path:
        """Get project root directory."""
        return Path(__file__).parent.parent.parent

    @property
    def data_dir(self) -> Path:
        """Get data directory."""
        if self.data_dir_override:
            return Path(self.data_dir_override)
        return self.project_root / "data"

    @property
    def transcripts_dir(self) -> Path:
        """Get transcripts directory."""
        return self.data_dir / "transcripts"

    @property
    def qdrant_path(self) -> Path:
        """Get Qdrant storage path."""
        return self.data_dir / "qdrant"

    @property
    def bm25_index_path(self) -> Path:
        """Get BM25 index path."""
        return self.data_dir / "bm25_index"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
