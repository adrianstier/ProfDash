"""Main FastAPI application for ScholarOS AI service."""

from fastapi import Depends, FastAPI, HTTPException, Request, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader

from app.config import get_settings, Settings
from app.routers import extract, summarize, grants, documents, agents, analytics

# API Key security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(
    api_key: str | None = Security(api_key_header),
    settings: Settings = Depends(get_settings),
) -> None:
    """Verify the API key if configured."""
    # Skip authentication if no API key is configured
    if not settings.api_key:
        return

    if api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# Create FastAPI app
app = FastAPI(
    title="ScholarOS AI Service",
    description="AI-powered features for academic productivity",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with API key dependency
app.include_router(
    extract.router,
    prefix="/api",
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    summarize.router,
    prefix="/api",
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    grants.router,
    prefix="/api",
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    documents.router,
    prefix="/api",
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    agents.router,
    prefix="/api",
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    analytics.router,
    prefix="/api",
    dependencies=[Depends(verify_api_key)],
)


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {"status": "healthy", "service": "ScholarOS AI"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
