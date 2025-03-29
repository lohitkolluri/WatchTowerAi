import uuid
from datetime import datetime
from typing import Any, ClassVar, Dict, Optional
from pydantic import BaseModel, Field, GetCoreSchemaHandler
from pydantic_core import core_schema
from bson import ObjectId

# Updated PyObjectId for Pydantic V2 compatibility
class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.union_schema(
            [
                core_schema.str_schema(),
                core_schema.is_instance_schema(ObjectId),
            ]
        )

    @classmethod
    def validate(cls, value):
        if not isinstance(value, (str, ObjectId)):
            raise ValueError("Invalid ObjectId")
        return str(value)

# MongoDB document models
class LogEntry(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    timestamp: datetime
    service_name: str
    environment: str
    level: str
    message: str
    error_code: str | None = None
    correlation_id: str | None = None
    raw_payload: dict | None = None  # Store the entire original payload

    # Classification fields
    log_type: str | None = None  # General type (e.g., "error", "request", "database", "auth")
    log_subtype: str | None = None  # More specific category (e.g., "db_connection_error", "auth_failure")
    confidence_score: float | None = None  # AI classification confidence (0.0-1.0)
    entities: dict | None = None  # Extracted entities from the log (e.g., usernames, IPs, etc.)
    tags: list[str] | None = None  # List of tags for the log

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }

class Alert(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
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

class Metric(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    service_name: str
    environment: str
    total: int = 0
    errors: int = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="last_updated")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }
