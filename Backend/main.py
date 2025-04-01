from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import uvicorn
from datetime import datetime
import os

# Import our routes
from app.routes.alerts import router as alerts_router
from app.routes.settings import router as settings_router

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("main")

# Create FastAPI app
app = FastAPI(
    title="WatchTowerAI API",
    description="API for WatchTowerAI monitoring and observability platform",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, this should be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(alerts_router)
app.include_router(settings_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to WatchTowerAI API",
        "version": "0.1.0",
        "status": "operational",
        "time": datetime.now().isoformat(),
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "time": datetime.now().isoformat(),
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
