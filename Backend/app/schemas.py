from datetime import datetime
from typing import Any
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
    error_code: str | None = None
    correlation_id: str | None = None
    additional_data: dict | None = None

class LogEntryRead(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    timestamp: datetime
    service_name: str
    environment: str
    level: str
    message: str
    error_code: str | None = None
    correlation_id: str | None = None
    raw_payload: dict | None = None

    # Classification fields
    log_type: str | None = None
    log_subtype: str | None = None
    confidence_score: float | None = None
    entities: dict | None = None
    tags: list[str] | None = None

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }

class AlertRead(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    timestamp: datetime
    service_name: str
    environment: str
    level: str
    message: str
    acknowledged: bool = False
    log_type: str | None = None
    log_subtype: str | None = None
    remediation: str | None = None

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }

class AlertUpdate(BaseModel):
    acknowledged: bool

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
