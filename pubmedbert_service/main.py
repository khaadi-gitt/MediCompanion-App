"""
PubMedBERT Embedding Microservice — runs on http://127.0.0.1:8001
Model : pritamdeka/S-PubMedBert-MS-MARCO
        PubMedBERT backbone fine-tuned for sentence-level semantic similarity.
        Output: 768d vectors (L2-normalised) — drop-in for pgvector(768).
"""
from contextlib import asynccontextmanager
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

MODEL_NAME = "pritamdeka/S-PubMedBert-MS-MARCO"

_model: Optional[SentenceTransformer] = None
_embed_dim: int = 0          # set at startup by encoding a test sentence


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model, _embed_dim
    print(f"[PubMedBERT] Loading model: {MODEL_NAME}")
    _model = SentenceTransformer(MODEL_NAME)

    # Warm-up encode — resolves actual dimension without using deprecated API
    test_vec = _model.encode(["warmup"], show_progress_bar=False)
    _embed_dim = int(test_vec.shape[1])
    print(f"[PubMedBERT] Ready — embedding dimension: {_embed_dim}")
    yield
    _model = None
    _embed_dim = 0


app = FastAPI(title="PubMedBERT Embedding Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    texts: Optional[List[str]] = None   # list of strings
    text:  Optional[str]       = None   # single string shorthand


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension:  int
    count:      int


@app.get("/health")
def health():
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    return {
        "status":    "ok",
        "model":     MODEL_NAME,
        "dimension": _embed_dim,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    if req.texts is not None:
        inputs = req.texts
    elif req.text is not None:
        inputs = [req.text]
    else:
        raise HTTPException(status_code=400, detail="Provide 'text' or 'texts' field")

    if not inputs:
        raise HTTPException(status_code=400, detail="Empty input")

    vectors = _model.encode(
        inputs,
        normalize_embeddings=True,   # L2-normalise — optimal for cosine similarity search
        show_progress_bar=False,
        batch_size=32,
    )

    return EmbedResponse(
        embeddings=[v.tolist() for v in vectors],
        dimension=int(vectors.shape[1]),
        count=len(inputs),
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=False)
