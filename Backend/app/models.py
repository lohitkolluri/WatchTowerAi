import uuid
from datetime import datetime
from typing import Any, ClassVar, Dict, Optional
from pydantic import BaseModel, Field, GetCoreSchemaHandler
from pydantic_core import core_schema

# Updated PyObjectId for Pydantic V2 compatibility
class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        """
        Define Pydantic V2 core schema for PyObjectId
        """
        return core_schema.union_schema([
            core_schema.is_instance_schema(cls),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls),
            ]),
        ])

    @classmethod
    def __get_validators__(cls):
        """
        Legacy method for Pydantic V1 compatibility - just in case
        """
        yield cls.validate

    @classmethod
    def validate(cls, value):
        """Validate and convert the value to PyObjectId"""
        if not isinstance(value, str):
            return str(value)
        return value

# MongoDB document models
class LogEntry(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    service_name: str
    environment: str
    level: str
    message: str
    error_code: Optional[str] = None
    correlation_id: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
        }

class Alert(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(uuid.uuid4()))
    service_name: str
    environment: str
    level: str
    message: str
    correlation_id: Optional[str] = None
    remediation: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    acknowledged: bool = False

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
        }

class Metric(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(uuid.uuid4()))
    service_name: str
    environment: str
    total: int = 0
    errors: int = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
        }
