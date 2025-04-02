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
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ],
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x) if isinstance(x, ObjectId) else x
            ),
        )

    @classmethod
    def validate(cls, value):
        if isinstance(value, ObjectId):
            return value
        if isinstance(value, str):
            # Don't try to convert empty strings to ObjectId
            if not value:
                raise ValueError("Empty string is not a valid ObjectId")
            try:
                return ObjectId(value)
            except ValueError:
                pass
        raise ValueError(f"'{value}' is not a valid ObjectId")

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
