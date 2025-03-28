from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class LogEntryCreate(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    service_name: str
    environment: str
    level: str  # e.g., INFO, WARN, ERROR
    message: str
    error_code: Optional[str] = None
    correlation_id: Optional[str] = None

# Updated response models to work with MongoDB documents directly
class LogEntryRead(BaseModel):
    id: str = Field(alias="_id")
    timestamp: datetime
    service_name: str
    environment: str
    level: str
    message: str
    error_code: Optional[str] = None
    correlation_id: Optional[str] = None

    # Fix for MongoDB document serialization
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            datetime: lambda dt: dt.isoformat(),
        }
    }

class AlertRead(BaseModel):
    id: str = Field(alias="_id")
    service_name: str
    environment: str
    level: str
    message: str
    correlation_id: Optional[str] = None
    remediation: Optional[str] = None
    timestamp: datetime
    acknowledged: bool

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            datetime: lambda dt: dt.isoformat(),
        }
    }

class AlertUpdate(BaseModel):
    acknowledged: bool

class MetricRead(BaseModel):
    id: str = Field(alias="_id")
    service_name: str
    environment: str
    total: int
    errors: int
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            datetime: lambda dt: dt.isoformat(),
        }
    }
