import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class LogEntryModel(Base):
    __tablename__ = "log_entries"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    service_name = Column(String, index=True)
    environment = Column(String, index=True)
    level = Column(String, index=True)
    message = Column(String)
    error_code = Column(String, nullable=True)
    correlation_id = Column(String, nullable=True)

class AlertModel(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    service_name = Column(String, index=True)
    environment = Column(String, index=True)
    severity = Column(String)
    description = Column(String)
    remediation = Column(String, nullable=True)
    acknowledged = Column(Boolean, default=False)

class MetricModel(Base):
    __tablename__ = "metrics"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    service_name = Column(String, index=True)
    environment = Column(String, index=True)
    total = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
