from datetime import datetime
from typing import Any, Optional, Dict, List
from pydantic import BaseModel, Field, GetCoreSchemaHandler
from pydantic_core import core_schema
from bson import ObjectId

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

class Log(BaseModel):
    timestamp: datetime
    level: str
    message: str
    service: str
    endpoint: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class LogsResponse(BaseModel):
    logs: List[Log]
    total: int

class LogsQueryParams(BaseModel):
    page: Optional[int] = 1
    limit: Optional[int] = 50
    service: Optional[str] = None
    level: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    search: Optional[str] = None
