from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class LogEntryCreate(BaseModel):
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    service_name: str
    environment: str
    level: str  # e.g., INFO, WARN, ERROR
    message: str
    error_code: Optional[str] = None
    correlation_id: Optional[str] = None

class LogEntryRead(BaseModel):
    id: str
    timestamp: datetime
    service_name: str
    environment: str
    level: str
    message: str
    error_code: Optional[str]
    correlation_id: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class AlertRead(BaseModel):
    id: str
    timestamp: datetime
    service_name: str
    environment: str
    severity: str
    description: str
    remediation: Optional[str]
    acknowledged: bool

    model_config = ConfigDict(from_attributes=True)

class AlertUpdate(BaseModel):
    acknowledged: bool

class MetricRead(BaseModel):
    service_name: str
    environment: str
    total: int
    errors: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
