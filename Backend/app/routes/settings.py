from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from pydantic import BaseModel
import logging
import json
import os
from pathlib import Path

router = APIRouter(prefix="/settings", tags=["settings"])

# Setup logging
logger = logging.getLogger("settings")

# Models
class SMTPConfig(BaseModel):
    host: str
    port: int
    username: str
    password: str
    from_email: str
    use_tls: bool

# Create config directory if it doesn't exist
config_dir = Path("./config")
config_dir.mkdir(exist_ok=True)
smtp_config_file = config_dir / "smtp_config.json"

# Default config
default_smtp_config = {
    "host": "",
    "port": 587,
    "username": "",
    "password": "",
    "from_email": "",
    "use_tls": True
}

# Helper functions
def get_smtp_config():
    if not smtp_config_file.exists():
        with open(smtp_config_file, "w") as f:
            json.dump(default_smtp_config, f)
        return default_smtp_config

    try:
        with open(smtp_config_file, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading SMTP config: {str(e)}")
        return default_smtp_config

def save_smtp_config(config):
    try:
        with open(smtp_config_file, "w") as f:
            json.dump(config, f)
        return True
    except Exception as e:
        logger.error(f"Error saving SMTP config: {str(e)}")
        return False

# Endpoints
@router.get("/smtp", response_model=SMTPConfig)
async def get_smtp_settings():
    """Get SMTP settings"""
    logger.info("Fetching SMTP settings")
    return get_smtp_config()

@router.put("/smtp", response_model=dict)
async def update_smtp_settings(config: SMTPConfig):
    """Update SMTP settings"""
    logger.info("Updating SMTP settings")

    # Save the config
    config_dict = config.dict()
    success = save_smtp_config(config_dict)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save SMTP configuration")

    return {"message": "SMTP configuration updated successfully", "config": config_dict}
