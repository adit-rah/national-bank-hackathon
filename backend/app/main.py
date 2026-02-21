from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import upload, analysis, counterfactual, coach


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="National Bank Bias Detector",
    description="AI-powered trading bias detection and coaching platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(counterfactual.router, prefix="/api", tags=["Counterfactual"])
app.include_router(coach.router, prefix="/api", tags=["Coach"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
