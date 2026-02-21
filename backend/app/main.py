"""FastAPI application – stateless trade bias analyser."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis, counterfactual

app = FastAPI(title="Trade Bias Analyser", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api")
app.include_router(counterfactual.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}