"""
Embedding tool — generates text-embedding-3-small vectors via OpenRouter.

OpenRouter's /api/v1/embeddings endpoint is OpenAI-SDK compatible.
Model: "openai/text-embedding-3-small" → 1536-dim vectors (matches DB schema VECTOR(1536))
"""
from __future__ import annotations

from openai import AsyncOpenAI
from core.config import settings

EMBEDDING_MODEL = "openai/text-embedding-3-small"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=settings.openrouter_api_key,
        )
    return _client


async def embed_text(text: str) -> list[float]:
    """Return a 1536-dim embedding for a single text string."""
    response = await _get_client().embeddings.create(
        model=EMBEDDING_MODEL,
        input=text.replace("\n", " "),
    )
    return response.data[0].embedding


async def embed_batch(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    """
    Embed a list of texts in batches.
    Returns embeddings in the same order as input.
    """
    results: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        chunk = texts[i : i + batch_size]
        response = await _get_client().embeddings.create(
            model=EMBEDDING_MODEL,
            input=[t.replace("\n", " ") for t in chunk],
        )
        results.extend([item.embedding for item in sorted(response.data, key=lambda x: x.index)])
    return results
