from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime
import re

router = APIRouter(prefix="/alerts", tags=["alerts"])

# Setup logging
logger = logging.getLogger("alerts")

# Models
class AlertBase(BaseModel):
    message: str
    service_name: str
    environment: str
    level: str
    status: str = "active"
    acknowledged: bool = False
    description: Optional[str] = None
    remediation: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    _id: str
    timestamp: str = datetime.now().isoformat()

    class Config:
        orm_mode = True

# Query parameters model
class AlertQueryParams(BaseModel):
    search: Optional[str] = None
    service: Optional[str] = None
    environment: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    page: int = 1
    limit: int = 20

# Mock data
mock_alerts = [
    {
        "_id": "123456789",
        "message": "High CPU usage detected",
        "service_name": "api-service",
        "environment": "production",
        "level": "warning",
        "status": "active",
        "timestamp": "2023-03-31T12:00:00",
        "acknowledged": False,
        "description": "CPU usage has exceeded 80% for over 5 minutes",
        "remediation": "Check for runaway processes or increase server capacity"
    },
    {
        "_id": "987654321",
        "message": "Database connection failed",
        "service_name": "db-service",
        "environment": "production",
        "level": "error",
        "status": "active",
        "timestamp": "2023-03-31T12:15:00",
        "acknowledged": False,
        "description": "Unable to connect to primary database",
        "remediation": "Check database server status and connection settings"
    },
    {
        "_id": "456789123",
        "message": "API rate limit exceeded",
        "service_name": "api-service",
        "environment": "development",
        "level": "warning",
        "status": "resolved",
        "timestamp": "2023-03-31T10:45:00",
        "acknowledged": True,
        "description": "External API rate limit has been reached",
        "remediation": "Implement request throttling or upgrade API plan"
    },
    {
        "_id": "654321987",
        "message": "Memory leak detected",
        "service_name": "web-service",
        "environment": "staging",
        "level": "critical",
        "status": "active",
        "timestamp": "2023-03-31T09:30:00",
        "acknowledged": False,
        "description": "Memory usage is continuously increasing",
        "remediation": "Check for memory leaks in the application code"
    },
    {
        "_id": "246813579",
        "message": "Application crashed",
        "service_name": "web-service",
        "environment": "production",
        "level": "critical",
        "status": "resolved",
        "timestamp": "2023-03-30T18:20:00",
        "acknowledged": True,
        "description": "Web service process terminated unexpectedly",
        "remediation": "Restart the service and check logs for error stack traces"
    }
]

# Helper functions
def filter_alerts(alerts, params: AlertQueryParams):
    """Apply filters to alerts based on query parameters"""
    filtered = alerts

    # Apply search filter
    if params.search:
        search_term = params.search.lower()
        filtered = [
            alert for alert in filtered
            if search_term in alert["message"].lower() or
               search_term in alert["service_name"].lower() or
               search_term in alert["environment"].lower()
        ]

    # Apply service filter
    if params.service and params.service != "all":
        filtered = [alert for alert in filtered if alert["service_name"] == params.service]

    # Apply environment filter
    if params.environment and params.environment != "all":
        filtered = [alert for alert in filtered if alert["environment"] == params.environment]

    # Apply severity/level filter
    if params.severity and params.severity != "all":
        filtered = [alert for alert in filtered if alert["level"].lower() == params.severity.lower()]

    # Apply status filter
    if params.status and params.status != "all":
        filtered = [alert for alert in filtered if alert["status"].lower() == params.status.lower()]

    return filtered

def paginate(items, page: int, limit: int):
    """Paginate a list of items"""
    start = (page - 1) * limit
    end = start + limit
    return items[start:min(end, len(items))]

# Endpoints
@router.get("/", response_model=dict)
async def get_alerts(
    search: Optional[str] = None,
    service: Optional[str] = None,
    environment: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get filtered and paginated alerts"""
    logger.info(f"Fetching alerts with filters: search={search}, service={service}, environment={environment}, severity={severity}, status={status}, page={page}, limit={limit}")

    # Create query params object
    params = AlertQueryParams(
        search=search,
        service=service,
        environment=environment,
        severity=severity,
        status=status,
        page=page,
        limit=limit
    )

    # Apply filters
    filtered_alerts = filter_alerts(mock_alerts, params)

    # Get total count before pagination
    total = len(filtered_alerts)

    # Apply pagination
    paginated_alerts = paginate(filtered_alerts, params.page, params.limit)

    # Calculate total pages
    total_pages = (total + params.limit - 1) // params.limit

    return {
        "data": paginated_alerts,
        "total": total,
        "page": params.page,
        "limit": params.limit,
        "total_pages": total_pages
    }
