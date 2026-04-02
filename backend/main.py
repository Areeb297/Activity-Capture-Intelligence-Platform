"""
Activity Analyser — FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure application logging — visible in the uvicorn terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

from db.connection import init_pool, close_pool
from routers import upload, analyse, status, results, dashboard, submissions, history


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    yield
    close_pool()


app = FastAPI(
    title="Activity Analyser API",
    version="0.1.0",
    description="Multi-agent analysis of employee activity capture spreadsheets.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers
app.include_router(upload.router)
app.include_router(analyse.router)
app.include_router(status.router)
app.include_router(results.router)
app.include_router(dashboard.router)
app.include_router(submissions.router)
app.include_router(history.router)


@app.get("/health")
def health():
    return {"status": "ok"}
