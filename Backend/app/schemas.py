from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, GetCoreSchemaHandler
from pydantic_core import core_schema
from bson import ObjectId
from .models import PyObjectId

class LogEntryCreate(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    service_name: str
    environment: str = "production"
    level: str = "INFO"
    message: str
    error_code: Optional[str] = None
    correlation_id: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None
    log_type: Optional[str] = None
    log_subtype: Optional[str] = None
    confidence_score: Optional[float] = None
    entities: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class LogEntryRead(LogEntryCreate):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str
        }

    @classmethod
    def from_mongo(cls, data: dict):
        """Convert MongoDB document to LogEntryRead model"""
        if not data:
            return None

        # Ensure _id is converted to string
        if "_id" in data:
            data["_id"] = str(data["_id"])

        return cls(**data)

class AlertRead(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    timestamp: datetime
    service_name: str
    environment: str
    level: str
    message: str
    acknowledged: bool = False
    status: str = "active"  # Default status is active
    log_type: str | None = None
    log_subtype: str | None = None
    remediation: str | None = None

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }

class AlertUpdate(BaseModel):
    acknowledged: bool | None = None
    status: str | None = None

class MetricRead(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    service_name: str
    environment: str
    total: int
    errors: int
    updated_at: datetime = Field(alias="last_updated")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }
