import logging
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, status, Body, Request, Depends, Security
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from .database import MongoDB, connect_to_mongo, close_mongo_connection, perform_db_operation, Database, get_database
from .models import LogEntry, Alert, Metric
from .schemas import LogEntryCreate, LogEntryRead, AlertRead, AlertUpdate, MetricRead, LogsResponse, LogsQueryParams
from .services.log_processor import process_log
from .services.gemini import check_gemini_api_availability
from contextlib import asynccontextmanager
import asyncio
from bson import ObjectId
import json
from typing import Optional

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("watchtower-ai")

# Custom JSON encoder for handling MongoDB ObjectId
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

# Security schemes
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

@asynccontextmanager
async def lifespan(app):
    logger.info("🚀 Starting up WatchTowerAI and connecting to MongoDB...")
    await connect_to_mongo()
    logger.info("✅ MongoDB connection established.")

    # Check if Gemini API is available
    logger.info("🤖 Checking Gemini API availability...")
    is_gemini_available, gemini_status = await check_gemini_api_availability()
    if is_gemini_available:
        logger.info(f"✅ {gemini_status}")
    else:
        logger.warning(f"⚠️ {gemini_status}")

    yield
    logger.info("🛑 WatchTowerAI is shutting down.")
    await close_mongo_connection()

# Custom Swagger UI CSS to enhance appearance
swagger_ui_css = """
<style>
    /* Header customization */
    .swagger-ui .topbar {
        background-color: #2c3e50;
        padding: 10px 0;
    }
    .swagger-ui .topbar .download-url-wrapper .select-label select {
        border-color: #3498db;
    }

    /* Main content customization */
    .swagger-ui .info .title {
        color: #2c3e50;
        font-size: 36px;
    }
    .swagger-ui .info {
        margin: 30px 0;
    }
    .swagger-ui .info .title small.version-stamp {
        background-color: #3498db;
    }

    /* Operation blocks */
    .swagger-ui .opblock.opblock-get {
        background: rgba(97, 175, 254, 0.1);
        border-color: #61affe;
    }
    .swagger-ui .opblock.opblock-post {
        background: rgba(73, 204, 144, 0.1);
        border-color: #49cc90;
    }
    .swagger-ui .opblock.opblock-patch {
        background: rgba(252, 161, 48, 0.1);
        border-color: #fca130;
    }

    /* Make the models section more readable */
    .swagger-ui .model-box {
        background: rgba(0, 0, 0, 0.025);
        padding: 10px;
        border-radius: 4px;
    }

    /* Make the examples stand out more */
    .swagger-ui .example {
        border-left: 4px solid #3498db;
        padding-left: 10px;
    }

    /* Button styling */
    .swagger-ui .btn {
        box-shadow: none;
        border-radius: 4px;
    }
    .swagger-ui .btn.execute {
        background-color: #2c3e50;
        color: white;
        border-color: #2c3e50;
    }

    /* Request parameters */
    .swagger-ui .parameters-col_description {
        width: 65%;
    }
    .swagger-ui .parameters-col_name {
        width: 35%;
    }

    /* Tags styling */
    .swagger-ui .opblock-tag {
        border-bottom: 1px solid rgba(59, 65, 81, 0.3);
        padding: 10px 20px 10px 10px;
    }
    .swagger-ui .opblock-tag:hover {
        background-color: rgba(0, 0, 0, 0.02);
    }

    /* Improve the schema tabs */
    .swagger-ui .tab li {
        padding: 5px 15px;
    }

    /* WatchTowerAI colors for specific sections */
    .swagger-ui .opblock-tag-section h3 {
        color: #2c3e50;
    }

    /* Make the response codes more visually distinct */
    .swagger-ui .responses-table .response-col_status {
        font-weight: bold;
    }

    /* Response 200 */
    .swagger-ui .response-col_status .response-undocumented {
        color: rgba(0, 0, 0, 0.5);
    }
    .swagger-ui .response-col_status .response-200 {
        color: #49cc90;
    }

    /* Response 400 */
    .swagger-ui .response-col_status .response-400 {
        color: #f93e3e;
    }

    /* Response 500 */
    .swagger-ui .response-col_status .response-500 {
        color: #e53935;
    }
</style>
"""

# Configure FastAPI with custom JSON encoder
app = FastAPI(
    title="WatchTowerAI API",
    description="""
    🚨 WatchTowerAI Backend API

    AI-powered API monitoring and alerting system that detects and predicts anomalies in your services.

    Key Features

    * Universal API Monitoring - Monitor any endpoint with any data structure
    * AI-powered Log Classification - Automatic categorization and entity extraction
    * Advanced Search - Find logs by type, entities, confidence, and more
    * Real-time Anomaly Detection - With Google Gemini AI
    * Smart Alerting - With remediation suggestions
    * Comprehensive Metrics - Track performance across services

    How It Works

    1. Send logs to /ingest or let the system capture any endpoint via /{path:path}
    2. Logs are automatically classified and analyzed for anomalies
    3. Issues trigger alerts with AI-generated remediation steps
    4. Search, filter, and query your logs and metrics

    Authentication

    Currently supporting two authentication methods:
    - API Key: Include your API key in the `X-API-Key` header
    - OAuth2: For secure integration with identity providers
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "logs",
            "description": "Operations for ingesting and querying log entries",
        },
        {
            "name": "alerts",
            "description": "Operations for managing and responding to alerts",
        },
        {
            "name": "metrics",
            "description": "Operations for retrieving service metrics",
        },
        {
            "name": "monitoring",
            "description": "Operations for monitoring external APIs and services",
        },
        {
            "name": "system",
            "description": "System health and maintenance operations",
        },
    ],
    contact={
        "name": "Lohit Kolluri",
        "email": "me@lohit.is-a.dev",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    swagger_ui_parameters={
        "defaultModelsExpandDepth": 3,  # Expand models by default
        "defaultModelExpandDepth": 3,   # Show nested models
        "deepLinking": True,           # Allow direct links to operations
        "displayOperationId": False,    # Don't show operation ID
        "displayRequestDuration": True, # Show request duration
        "filter": True,                # Enable filtering operations by tag
        "showExtensions": True,        # Show all extensions
        "showCommonExtensions": True,  # Show common extensions
        "tryItOutEnabled": True,       # Enable Try It Out by default
        "docExpansion": "list",        # Expand operations by default
        "persistAuthorization": True,  # Persist auth info across page reloads
        "syntaxHighlight.theme": "monokai", # Use monokai theme for syntax highlighting
        "layout": "BaseLayout",
        "supportedSubmitMethods": [
            "get", "put", "post", "delete", "options", "head", "patch", "trace"
        ],
    },
    openapi_extra={
        "components": {
            "securitySchemes": {
                "apiKeyAuth": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-API-Key"
                },
                "oauth2Auth": {
                    "type": "oauth2",
                    "flows": {
                        "password": {
                            "tokenUrl": "/token",
                            "scopes": {
                                "read": "Read access",
                                "write": "Write access"
                            }
                        }
                    }
                }
            }
        },
        "security": [
            {"apiKeyAuth": []},
            {"oauth2Auth": ["read", "write"]}
        ]
    },
    # Add this line to use the custom JSON encoder
    default_response_class=JSONResponse
)

# Override FastAPI's default JSON response class to use our custom encoder
app.json_encoder = CustomJSONEncoder

# Custom middleware to inject CSS into the Swagger UI
@app.middleware("http")
async def add_custom_ui(request: Request, call_next):
    response = await call_next(request)

    # Only modify the Swagger UI HTML response
    if request.url.path == "/docs" and "text/html" in response.headers.get("content-type", ""):
        html_content = [chunk async for chunk in response.body_iterator]
        html_content = b"".join(html_content).decode()

        # Insert our custom CSS before the closing head tag
        modified_html = html_content.replace("</head>", f"{swagger_ui_css}</head>")

        # Create a new response with our modified content
        # Remove content-length header to prevent mismatch
        response_headers = dict(response.headers)
        if "content-length" in response_headers:
            del response_headers["content-length"]

        return HTMLResponse(
            content=modified_html,
            status_code=response.status_code,
            headers=response_headers,
        )

    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://watchtower-ai.vercel.app", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "Accept", "Origin", "User-Agent", "X-Requested-With"],
    max_age=3600,  # Cache preflight response for 1 hour
    expose_headers=["X-Process-Time", "X-Request-ID"]
)

# Define API tags for better documentation organization
tags_metadata = [
    {
        "name": "logs",
        "description": "Operations for ingesting and querying log entries",
    },
    {
        "name": "alerts",
        "description": "Operations for managing and responding to alerts",
    },
    {
        "name": "metrics",
        "description": "Operations for retrieving service metrics",
    },
    {
        "name": "monitoring",
        "description": "Operations for monitoring external APIs and services",
    },
    {
        "name": "system",
        "description": "System health and maintenance operations",
    },
]

# Example log for documentation
example_log = {
    "timestamp": "2023-08-18T14:35:12.345Z",
    "service_name": "payment-service",
    "environment": "production",
    "level": "ERROR",
    "message": "Payment gateway connection timeout",
    "error_code": "ERR_GATEWAY_TIMEOUT",
    "correlation_id": "7f52cdb3-9c23-4d7e-89d1-98234c70a381"
}

@app.post(
    "/ingest",
    response_model=LogEntryRead,
    status_code=status.HTTP_201_CREATED,
    tags=["logs"],
    summary="Ingest a log entry from any service",
    description="""
    Submit a log entry to be processed and analyzed.

    This endpoint is flexible and can accept data from any service.
    Required fields:
    - service_name: Name of the service sending the log

    All other fields are optional and will be stored as received.
    """,
    responses={
        201: {
            "description": "Log entry successfully created and processing triggered",
            "content": {
                "application/json": {
                    "example": {
                        "id": "6070643e-1e7d-4c33-9a2e-23a71a9387cc",
                        "timestamp": "2023-08-18T14:35:12.345Z",
                        "service_name": "payment-service",
                        "environment": "production",
                        "level": "ERROR",
                        "message": "Payment gateway connection timeout",
                        "error_code": "ERR_GATEWAY_TIMEOUT",
                        "correlation_id": "7f52cdb3-9c23-4d7e-89d1-98234c70a381",
                        "log_type": "database",
                        "log_subtype": "connection_error",
                        "confidence_score": 0.92,
                        "entities": {
                            "ip_address": "192.168.1.1",
                            "resource_id": "pg-instance-12345"
                        },
                        "tags": ["database", "timeout", "payment"]
                    }
                }
            }
        },
        400: {
            "description": "Missing required field",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Service name is required either in payload or as a query parameter"
                    }
                }
            }
        },
        500: {
            "description": "Server error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error storing log entry"
                    }
                }
            }
        }
    }
)
async def ingest_log(
    payload: dict,
    background_tasks: BackgroundTasks,
    service_name: str = Query(None, description="Service name if not included in payload"),
    environment: str = Query(None, description="Environment if not included in payload"),
):
    # Extract service name from payload or query param
    extracted_service = payload.get("service_name", service_name)
    if not extracted_service:
        raise HTTPException(status_code=400, detail="Service name is required either in payload or as a query parameter")

    # Extract or set default values for common fields
    extracted_environment = payload.get("environment", environment or "production")
    extracted_level = payload.get("level", "INFO")
    extracted_message = payload.get("message", str(payload))

    # Use timestamp from payload or create new one
    try:
        if "timestamp" in payload and payload["timestamp"]:
            extracted_timestamp = datetime.fromisoformat(str(payload["timestamp"]).replace("Z", "+00:00"))
        else:
            extracted_timestamp = datetime.utcnow()
    except (ValueError, TypeError):
        extracted_timestamp = datetime.utcnow()

    logger.info(f"�� Ingesting log from {extracted_service} [{extracted_level}]")

    try:
        # Create new log entry document with standardized fields
        new_log = LogEntry(
            timestamp=extracted_timestamp,
            service_name=extracted_service,
            environment=extracted_environment,
            level=extracted_level,
            message=extracted_message,
            error_code=payload.get("error_code"),
            correlation_id=payload.get("correlation_id"),
            raw_payload=payload,  # Store the entire original payload
        )

        # Insert into MongoDB - improved approach: exclude ID fields and let MongoDB generate one
        log_dict = new_log.model_dump(exclude={"id", "_id"}, by_alias=True)

        async def insert_log():
            result = await MongoDB.log_entries.insert_one(log_dict)
            if not result.inserted_id:
                raise HTTPException(status_code=500, detail="Failed to insert log")

            # Fetch the inserted document for the response
            document = await MongoDB.log_entries.find_one({"_id": result.inserted_id})
            if not document:
                raise HTTPException(status_code=500, detail="Failed to retrieve inserted document")

            # Convert ObjectId to string to avoid serialization issues
            document["_id"] = str(document["_id"])
            return document

        inserted_doc = await perform_db_operation(insert_log)

        # Process log in background
        background_tasks.add_task(process_log, new_log)
        logger.info("✅ Log stored and processing triggered")
        return inserted_doc

    except ConnectionFailure as e:
        logger.error(f"MongoDB connection error: {e}")
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    except Exception as e:
        logger.error(f"Error inserting log: {str(e)}")
        raise HTTPException(status_code=500, detail="Error storing log entry")

@app.get(
    "/logs",
    response_model=LogsResponse,
    tags=["logs"],
    summary="Retrieve log entries",
    description="Get log entries with optional filtering by service, environment, level, and time range.",
    response_description="List of matching log entries, sorted by timestamp (newest first)"
)
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    service: Optional[str] = None,
    level: Optional[str] = None,
    startDate: Optional[datetime] = None,
    endDate: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Database = Depends(get_database)
):
    logs, total = await db.get_logs(
        page=page,
        limit=limit,
        service=service,
        level=level,
        start_date=startDate,
        end_date=endDate,
        search=search
    )
    return {"logs": logs, "total": total}

@app.get("/logs/services", response_model=list[str])
async def get_services(db: Database = Depends(get_database)):
    return await db.get_services_list()

@app.delete("/logs")
async def clear_logs(db: Database = Depends(get_database)):
    deleted_count = await db.clear_logs()
    return {"message": f"Deleted {deleted_count} logs"}

@app.get(
    "/alerts",
    response_model=list[AlertRead],
    tags=["alerts"],
    summary="Retrieve alerts",
    description="Get alerts with optional filtering by service, environment, and acknowledgment status.",
    response_description="List of matching alerts, sorted by timestamp (newest first)",
    responses={
        200: {
            "description": "Alerts retrieved successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "critical_alerts": {
                            "summary": "Critical unacknowledged alerts",
                            "value": [{
                                "id": "a123456b-7c89-0123-def4-56789abcdef0",
                                "timestamp": "2023-08-19T08:15:22.123Z",
                                "service_name": "payment-service",
                                "environment": "production",
                                "level": "ERROR",
                                "message": "Payment gateway connection timeout after 30s",
                                "log_type": "database",
                                "log_subtype": "connection_timeout",
                                "remediation": "Check network connectivity to payment gateway. Verify firewall rules are correctly configured.",
                                "acknowledged": False
                            }]
                        },
                        "security_alerts": {
                            "summary": "Security-related alerts",
                            "value": [{
                                "id": "b234567c-8d90-1234-efg5-67890abcdef1",
                                "timestamp": "2023-08-19T09:32:45.789Z",
                                "service_name": "auth-service",
                                "environment": "production",
                                "level": "WARN",
                                "message": "Multiple failed login attempts detected for user admin@example.com",
                                "log_type": "auth",
                                "log_subtype": "repeated_auth_failure",
                                "remediation": "Verify if this is a legitimate user. Consider temporarily locking the account if suspicious.",
                                "acknowledged": True
                            }]
                        },
                        "performance_alerts": {
                            "summary": "Performance degradation alerts",
                            "value": [{
                                "id": "c345678d-9e01-2345-fgh6-78901abcdef2",
                                "timestamp": "2023-08-19T10:45:12.456Z",
                                "service_name": "api-gateway",
                                "environment": "production",
                                "level": "WARN",
                                "message": "API response time exceeding threshold - 95th percentile at 2.5s",
                                "log_type": "performance",
                                "log_subtype": "response_time_degradation",
                                "remediation": "Check database query performance. Consider scaling up the service if load is high.",
                                "acknowledged": False
                            }]
                        }
                    }
                }
            }
        },
        500: {
            "description": "Error retrieving alerts",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error retrieving alerts"
                    }
                }
            }
        },
        401: {
            "description": "Authentication required",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Not authenticated"
                    }
                }
            }
        }
    }
)
async def get_alerts(
    token: str = Depends(oauth2_scheme),
    service_name: str = Query(None, description="Filter by service name"),
    environment: str = Query(None, description="Filter by environment (dev/staging/production)"),
    acknowledged: bool = Query(None, description="Filter by acknowledgment status"),
    skip_invalid: bool = Query(True, description="Skip alerts with invalid format")
):
    logger.info("🚨 Fetching alerts...")

    # Build filter criteria
    filter_criteria = {}
    if service_name:
        filter_criteria["service_name"] = service_name
    if environment:
        filter_criteria["environment"] = environment
    if acknowledged is not None:
        filter_criteria["acknowledged"] = acknowledged

    # Only include documents with a valid _id field
    if skip_invalid:
        filter_criteria["_id"] = {"$exists": True, "$ne": None}

    async def fetch_alerts():
        cursor = MongoDB.alerts.find(filter_criteria).sort("timestamp", DESCENDING)
        alerts = await cursor.to_list(length=100)
        formatted_alerts = []

        # Convert data to match the schema
        for alert in alerts:
            try:
                # Ensure _id exists and is valid
                if "_id" not in alert:
                    logger.warning(f"Alert missing _id field: {alert}")
                    continue

                if not alert["_id"]:
                    logger.warning(f"Alert has empty _id: {alert}")
                    continue

                # Check for required fields (minimal validation)
                required_fields = ["message", "service_name", "level", "timestamp"]
                missing_fields = [field for field in required_fields if field not in alert]

                if missing_fields:
                    logger.warning(f"Alert missing required fields {missing_fields}: {alert}")
                    continue

                # Convert ObjectId to string
                alert["_id"] = str(alert["_id"])
                formatted_alerts.append(alert)

            except Exception as e:
                logger.error(f"Error processing alert {alert.get('_id', 'unknown')}: {e}")
                # Continue processing other alerts despite this error
                continue

        logger.info(f"⚠️ Found {len(formatted_alerts)} alerts")
        return formatted_alerts

    try:
        alerts = await perform_db_operation(fetch_alerts)

        # Log a sample of alerts for debugging
        for i, alert in enumerate(alerts[:3]):  # Show first 3 alerts
            logger.info(f"🔔 [{alert.get('level', 'UNKNOWN')}] {alert.get('message', 'No message')[:50]}...")
            if alert.get('remediation'):
                logger.info(f"↪ Remediation: {alert.get('remediation')[:100]}...")  # Fixed closing bracket

        return alerts
    except Exception as e:
        logger.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving alerts")

@app.patch(
    "/alerts/{alert_id}",
    response_model=AlertRead,
    tags=["alerts"],
    summary="Update alert acknowledgment status",
    description="Mark an alert as acknowledged or unacknowledged.",
    response_description="The updated alert with its new acknowledgment status"
)
async def update_alert(
    alert_id: str,
    update: AlertUpdate
):
    logger.info(f"📝 Acknowledging alert: {alert_id}")

    # Validate ID early to prevent errors
    if not alert_id or len(alert_id) != 24:
        logger.warning(f"Invalid ObjectId format: {alert_id}")
        raise HTTPException(status_code=400, detail="Invalid alert ID format")

    try:
        object_id = ObjectId(alert_id)
    except Exception as e:
        logger.warning(f"Failed to convert {alert_id} to ObjectId: {e}")
        raise HTTPException(status_code=400, detail="Invalid alert ID format")

    async def update_alert_op():
        # Use proper ObjectId for queries
        result = await MongoDB.alerts.update_one(
            {"_id": object_id},
            {"$set": {"acknowledged": update.acknowledged}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")

        updated_alert = await MongoDB.alerts.find_one({"_id": object_id})
        # Ensure _id is a string
        if updated_alert:
            updated_alert["_id"] = str(updated_alert["_id"])
        return updated_alert

    try:
        updated = await perform_db_operation(update_alert_op)
        logger.info("✅ Alert updated")
        return updated
    except HTTPException:
        logger.warning("❌ Alert not found")
        raise
    except Exception as e:
        logger.error(f"Error updating alert: {e}")
        raise HTTPException(status_code=500, detail="Error updating alert")

@app.get(
    "/metrics",
    response_model=list[MetricRead],
    tags=["metrics"],
    summary="Retrieve service metrics",
    description="Get aggregated metrics for all monitored services and environments.",
    response_description="List of service metrics including error counts and totals",
    responses={
        200: {
            "description": "Metrics retrieved successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "service_metrics": {
                            "summary": "Service-level metrics",
                            "value": [{
                                "id": "m123456b-7c89-0123-def4-56789abcdef0",
                                "service_name": "payment-service",
                                "environment": "production",
                                "metric_type": "log_volumes",
                                "total": 1250,
                                "errors": 15,
                                "warnings": 48,
                                "info": 1187,
                                "error_rate": 0.012,  # 1.2%
                                "last_updated": "2023-08-19T15:30:22.123Z"
                            }]
                        },
                        "api_performance": {
                            "summary": "API performance metrics",
                            "value": [{
                                "id": "m234567c-8d90-1234-efg5-67890abcdef1",
                                "service_name": "api-gateway",
                                "environment": "production",
                                "metric_type": "api_performance",
                                "total_requests": 5432,
                                "status_200": 5245,
                                "status_4xx": 156,
                                "status_5xx": 31,
                                "error_rate": 0.034,  # 3.4%
                                "recent_response_times": [45.2, 67.8, 52.3, 48.1, 63.2],
                                "avg_response_time_ms": 55.32,
                                "p95_response_time_ms": 98.45,
                                "p99_response_time_ms": 145.67,
                                "last_updated": "2023-08-19T15:30:22.123Z"
                            }]
                        },
                        "database_metrics": {
                            "summary": "Database performance metrics",
                            "value": [{
                                "id": "m345678d-9e01-2345-fgh6-78901abcdef2",
                                "service_name": "database-service",
                                "environment": "production",
                                "metric_type": "database",
                                "total_queries": 12500,
                                "slow_queries": 37,
                                "query_errors": 5,
                                "avg_query_time_ms": 8.45,
                                "connections_current": 25,
                                "connections_max": 100,
                                "last_updated": "2023-08-19T15:30:22.123Z"
                            }]
                        }
                    }
                }
            }
        },
        500: {
            "description": "Error retrieving metrics",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error retrieving metrics"
                    }
                }
            }
        },
        401: {
            "description": "Authentication required",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "API key required"
                    }
                }
            }
        }
    }
)
async def get_metrics(api_key: str = Security(api_key_header)):
    logger.info("📊 Retrieving metrics...")

    async def fetch_metrics():
        cursor = MongoDB.metrics.find()
        metrics = await cursor.to_list(length=100)
        formatted_metrics = []

        # Convert data to match the schema
        for metric in metrics:
            # Ensure _id is a string
            metric["_id"] = str(metric["_id"])

            # Handle the updated_at/last_updated field - this is critical for the schema
            if "updated_at" in metric:
                # Rename to match schema expectation (updated_at with alias last_updated)
                metric["last_updated"] = metric["updated_at"]
            else:
                # If missing, use current time
                metric["last_updated"] = datetime.utcnow()
                metric["updated_at"] = datetime.utcnow()

            # Ensure required fields are present
            if "total" not in metric:
                metric["total"] = 0
            if "errors" not in metric:
                metric["errors"] = 0

            formatted_metrics.append(metric)

        return formatted_metrics

    try:
        metrics = await perform_db_operation(fetch_metrics)
        logger.info(f"✅ {len(metrics)} metric entries returned")
        return metrics
    except Exception as e:
        logger.error(f"Error fetching metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving metrics")

@app.get("/health",
    summary="Health check endpoint",
    description="Simple health check to verify the API is running.",
    tags=["system"]
)
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/documentation", response_class=HTMLResponse, include_in_schema=False)
async def custom_documentation():
    logger.info("📘 Serving static documentation page")
    html_content = """
    <html>
      <head>
        <title>WatchTowerAI Documentation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { color: #3498db; }
          h2 { color: #2980b9; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          code {
            background-color: #f8f9fa;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
          }
          .endpoint {
            background-color: #f8f9fa;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
          }
          .method {
            font-weight: bold;
            color: #3498db;
          }
          .feature {
            margin-bottom: 20px;
          }
          .new-badge {
            background-color: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.7em;
            vertical-align: top;
            margin-left: 5px;
          }
        </style>
      </head>
      <body>
        <h1>WatchTowerAI API Documentation</h1>
        <p>For full interactive API docs, visit <a href='/docs'>Swagger UI</a>.</p>

        <h2>Key Features</h2>

        <div class="feature">
          <h3>Universal API Monitoring <span class="new-badge">NEW</span></h3>
          <p>Monitor any endpoint with any data structure automatically. Simply direct traffic to any undefined path with <code>/{path:path}</code> and the system will capture, classify, and analyze the requests.</p>
        </div>

        <div class="feature">
          <h3>Intelligent Log Classification <span class="new-badge">NEW</span></h3>
          <p>Automatically categorize logs by type (database, auth, request, performance, security, infrastructure), extract entities (IPs, user IDs, emails), and assign confidence scores for better analysis.</p>
        </div>

        <div class="feature">
          <h3>Advanced Search Capabilities <span class="new-badge">NEW</span></h3>
          <p>Find logs by classification type, extracted entities, confidence score, and other criteria using <code>/logs/search</code>.</p>
        </div>

        <h2>Endpoints</h2>

        <div class="endpoint">
          <p><span class="method">POST</span> <code>/ingest</code></p>
          <p>Ingest a log entry and trigger analysis.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">GET</span> <code>/logs</code></p>
          <p>Retrieve logs with filters for service, environment, level, and time range.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">GET</span> <code>/logs/search</code> <span class="new-badge">NEW</span></p>
          <p>Advanced search by log type, subtype, entities, tags, and confidence score.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">GET</span> <code>/alerts</code></p>
          <p>Retrieve alerts with filtering options.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">PATCH</span> <code>/alerts/{alert_id}</code></p>
          <p>Update (acknowledge) an alert.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">GET</span> <code>/metrics</code></p>
          <p>Retrieve aggregated metrics.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">POST</span> <code>/monitor/api</code> <span class="new-badge">NEW</span></p>
          <p>Register an external API endpoint for monitoring.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">GET</span> <code>/monitor/api</code> <span class="new-badge">NEW</span></p>
          <p>Get results from monitored API endpoints.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">ANY</span> <code>/{path:path}</code> <span class="new-badge">NEW</span></p>
          <p>Universal monitoring endpoint that captures any request to undefined paths.</p>
        </div>

        <div class="endpoint">
          <p><span class="method">GET</span> <code>/health</code></p>
          <p>Simple health check endpoint.</p>
        </div>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post(
    "/monitor/api",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    tags=["monitoring"],
    summary="Monitor an external API endpoint",
    description="""
    Register an external API endpoint for active, scheduled monitoring.

    This endpoint allows you to:

    * **Register any API endpoint**: Monitor RESTful APIs, GraphQL endpoints, webhooks, etc.
    * **Capture full responses**: Store complete response data for analysis
    * **Track performance metrics**: Response times, status codes, error rates
    * **Set expectations**: Define expected status codes and success criteria
    * **Receive alerts**: Get notified when endpoints fail or degrade

    WatchTowerAI will actively probe the registered endpoints, store their responses, and analyze patterns for anomalies.
    Combined with the automatic classification system, this provides comprehensive API observability.

    Performance metrics are tracked by service, environment, and endpoint.
    """,
    responses={
        200: {
            "description": "Monitoring successfully initiated",
            "content": {
                "application/json": {
                    "examples": {
                        "rest_api": {
                            "summary": "REST API endpoint monitoring",
                            "value": {
                                "status": "monitoring_initiated",
                                "monitor_id": "60a6b3c2d4e5f6a7b8c9d0e1",
                                "message": "API monitoring initiated for GET https://api.example.com/v1/users",
                                "timestamp": "2023-08-21T16:05:22.123Z"
                            }
                        },
                        "graphql": {
                            "summary": "GraphQL endpoint monitoring",
                            "value": {
                                "status": "monitoring_initiated",
                                "monitor_id": "60a6b3c2d4e5f6a7b8c9d0e2",
                                "message": "API monitoring initiated for POST https://api.example.com/graphql",
                                "timestamp": "2023-08-21T16:07:35.789Z"
                            }
                        }
                    }
                }
            }
        },
        500: {
            "description": "Error setting up monitoring",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Failed to initiate API monitoring: Connection error"
                    }
                }
            }
        }
    }
)
async def monitor_api_endpoint(
    background_tasks: BackgroundTasks,
    url: str = Body(..., description="Full URL of the API endpoint to monitor"),
    method: str = Body("GET", description="HTTP method to use (GET, POST, PUT, etc.)"),
    service_name: str = Body(..., description="Name of the service this API belongs to"),
    environment: str = Body("production", description="Environment (production, staging, etc.)"),
    headers: dict = Body({}, description="Headers to include in the request"),
    body: dict | None = Body(None, description="Request body for POST/PUT methods"),
    expected_status_code: int = Body(200, description="Expected HTTP status code"),
    alert_on_failure: bool = Body(True, description="Generate alerts if API check fails")
):
    logger.info(f"🔍 Monitoring API endpoint: {method} {url} for service {service_name}")

    timestamp = datetime.utcnow()

    try:
        # Record the request
        api_check = {
            "timestamp": timestamp,
            "service_name": service_name,
            "environment": environment,
            "url": url,
            "method": method,
            "request_headers": headers,
            "request_body": body,
            "expected_status_code": expected_status_code
        }

        # Store this monitoring request
        async def insert_monitor_request():
            result = await MongoDB.api_monitors.insert_one(api_check)
            return result.inserted_id

        monitor_id = await perform_db_operation(insert_monitor_request)

        # Process the API monitoring in the background
        background_tasks.add_task(
            process_api_monitor,
            monitor_id,
            url,
            method,
            service_name,
            environment,
            headers,
            body,
            expected_status_code,
            alert_on_failure
        )

        return {
            "status": "monitoring_initiated",
            "monitor_id": str(monitor_id),
            "message": f"API monitoring initiated for {method} {url}",
            "timestamp": timestamp
        }

    except Exception as e:
        logger.error(f"Error setting up API monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate API monitoring: {str(e)}")

# Function used by background task to monitor APIs
async def process_api_monitor(
    monitor_id,
    url,
    method,
    service_name,
    environment,
    headers,
    body,
    expected_status_code,
    alert_on_failure
):
    import httpx
    import time

    start_time = time.time()
    response_data = None
    status_code = None
    error_message = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method.upper() == "GET":
                response = await client.get(url, headers=headers)
            elif method.upper() == "POST":
                response = await client.post(url, headers=headers, json=body)
            elif method.upper() == "PUT":
                response = await client.put(url, headers=headers, json=body)
            elif method.upper() == "DELETE":
                response = await client.delete(url, headers=headers)
            else:
                response = await client.request(method, url, headers=headers, json=body)

            response_time = time.time() - start_time
            status_code = response.status_code

            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text[:1000]}

            # Update the monitor record with the response
            result = {
                "response_time_ms": round(response_time * 1000, 2),
                "status_code": status_code,
                "response_data": response_data,
                "success": status_code == expected_status_code,
                "completed_at": datetime.utcnow()
            }

            await MongoDB.api_monitors.update_one(
                {"_id": monitor_id},
                {"$set": result}
            )

            # Create a metric entry for this service's API performance
            await MongoDB.metrics.update_one(
                {
                    "service_name": service_name,
                    "environment": environment,
                    "metric_type": "api_performance"
                },
                {
                    "$inc": {
                        "total_requests": 1,
                        f"status_{status_code}": 1
                    },
                    "$push": {
                        "recent_response_times": {
                            "$each": [round(response_time * 1000, 2)],
                            "$slice": -100  # Keep last 100 response times
                        }
                    },
                    "$set": {
                        "updated_at": datetime.utcnow(),
                        "last_updated": datetime.utcnow()
                    }
                },
                upsert=True
            )

            # Generate an alert if the status code doesn't match expected
            if alert_on_failure and status_code != expected_status_code:
                alert = Alert(
                    timestamp=datetime.utcnow(),
                    service_name=service_name,
                    environment=environment,
                    level="ERROR",
                    message=f"API endpoint {method} {url} returned unexpected status code {status_code} (expected {expected_status_code})",
                    acknowledged=False
                )

                await MongoDB.alerts.insert_one(alert.model_dump(by_alias=True))
                logger.warning(f"⚠️ Alert generated for API endpoint {url} - unexpected status code {status_code}")

    except Exception as e:
        error_message = str(e)
        logger.error(f"Error monitoring API endpoint {url}: {error_message}")

        # Update the monitor record with the error
        await MongoDB.api_monitors.update_one(
            {"_id": monitor_id},
            {"$set": {
                "error": error_message,
                "success": False,
                "completed_at": datetime.utcnow()
            }}
        )

        # Generate an alert for the error
        if alert_on_failure:
            alert = Alert(
                timestamp=datetime.utcnow(),
                service_name=service_name,
                environment=environment,
                level="ERROR",
                message=f"Error monitoring API endpoint {method} {url}: {error_message}",
                acknowledged=False
            )

            await MongoDB.alerts.insert_one(alert.model_dump(by_alias=True))
            logger.warning(f"⚠️ Alert generated for API endpoint {url} - error: {error_message}")

@app.get(
    "/monitor/api",
    response_model=list[dict],
    tags=["monitoring"],
    summary="Get API monitoring results",
    description="""
    Retrieve the results of previously monitored API endpoints with powerful filtering options.

    This endpoint returns detailed information about API monitoring activities:

    * Request details (URL, method, headers, body)
    * Response data (status code, body, headers)
    * Performance metrics (response time)
    * Success status based on expected criteria
    * Timestamps for monitoring events

    Use the filtering options to narrow down results by service, environment, URL, or success status.
    Results are sorted by timestamp with newest first.
    """,
    responses={
        200: {
            "description": "Monitoring results retrieved successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "successful_checks": {
                            "summary": "Successful API checks",
                            "value": [{
                                "_id": "60a6b3c2d4e5f6a7b8c9d0e1",
                                "timestamp": "2023-08-21T16:05:22.123Z",
                                "service_name": "user-service",
                                "environment": "production",
                                "url": "https://api.example.com/v1/users",
                                "method": "GET",
                                "request_headers": {
                                    "Authorization": "Bearer ***",
                                    "Content-Type": "application/json"
                                },
                                "request_body": None,
                                "expected_status_code": 200,
                                "response_time_ms": 156.78,
                                "status_code": 200,
                                "response_data": {
                                    "users": [
                                        {"id": 1, "name": "John Doe"},
                                        {"id": 2, "name": "Jane Smith"}
                                    ],
                                    "count": 2
                                },
                                "success": True,
                                "completed_at": "2023-08-21T16:05:22.280Z"
                            }]
                        },
                        "failed_checks": {
                            "summary": "Failed API checks",
                            "value": [{
                                "_id": "60a6b3c2d4e5f6a7b8c9d0e2",
                                "timestamp": "2023-08-21T16:07:35.789Z",
                                "service_name": "payment-service",
                                "environment": "production",
                                "url": "https://api.example.com/v1/payments",
                                "method": "POST",
                                "request_headers": {
                                    "Authorization": "Bearer ***",
                                    "Content-Type": "application/json"
                                },
                                "request_body": {
                                    "amount": 100.00,
                                    "currency": "USD"
                                },
                                "expected_status_code": 201,
                                "response_time_ms": 2345.67,
                                "status_code": 500,
                                "response_data": {
                                    "error": "Internal Server Error",
                                    "message": "Payment gateway unavailable"
                                },
                                "success": False,
                                "completed_at": "2023-08-21T16:07:38.135Z"
                            }]
                        },
                        "timeout": {
                            "summary": "API timeout",
                            "value": [{
                                "_id": "60a6b3c2d4e5f6a7b8c9d0e3",
                                "timestamp": "2023-08-21T16:10:45.123Z",
                                "service_name": "inventory-service",
                                "environment": "production",
                                "url": "https://api.example.com/v1/inventory/check",
                                "method": "GET",
                                "request_headers": {
                                    "Authorization": "Bearer ***",
                                    "Content-Type": "application/json"
                                },
                                "request_body": None,
                                "expected_status_code": 200,
                                "error": "Request timed out after 30000ms",
                                "success": False,
                                "completed_at": "2023-08-21T16:11:15.123Z"
                            }]
                        }
                    }
                }
            }
        },
        500: {
            "description": "Error retrieving monitoring results",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error retrieving API monitoring results"
                    }
                }
            }
        }
    }
)
async def get_api_monitoring_results(
    service_name: str = Query(None, description="Filter by service name"),
    environment: str = Query(None, description="Filter by environment"),
    url: str = Query(None, description="Filter by URL (exact match)"),
    success: bool = Query(None, description="Filter by success status"),
    limit: int = Query(50, description="Maximum number of records to return", ge=1, le=1000)
):
    logger.info("📊 Retrieving API monitoring results...")

    # Build filter criteria
    filter_criteria = {}
    if service_name:
        filter_criteria["service_name"] = service_name
    if environment:
        filter_criteria["environment"] = environment
    if url:
        filter_criteria["url"] = url
    if success is not None:
        filter_criteria["success"] = success

    async def fetch_results():
        cursor = MongoDB.api_monitors.find(filter_criteria).sort("timestamp", DESCENDING).limit(limit)
        results = await cursor.to_list(length=limit)

        # Format the results
        formatted_results = []
        for result in results:
            result["_id"] = str(result["_id"])
            formatted_results.append(result)

        return formatted_results

    try:
        results = await perform_db_operation(fetch_results)
        logger.info(f"✅ {len(results)} API monitoring results returned")
        return results
    except Exception as e:
        logger.error(f"Error fetching API monitoring results: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving API monitoring results")

@app.get(
    "/logs/search",
    response_model=list[LogEntryRead],
    tags=["logs"],
    summary="Search logs by classification",
    description="""
    Advanced search for logs based on AI-powered classification, extracted entities, and metadata.

    This endpoint supports filtering by:

    * **Log Type**: Primary classification (database, auth, request, performance, security, infrastructure)
    * **Log Subtype**: Specific category (connection_error, login_failure, server_error, etc.)
    * **Tags**: Auto-generated or custom labels for easier filtering
    * **Entities**: Extracted values like IP addresses, emails, user IDs, timestamps, URLs
    * **Confidence Score**: Minimum confidence threshold for classification quality
    * **Standard Filters**: Service name, environment, time range

    Results are sorted by timestamp (newest first) and limited to the specified count.
    """,
    response_description="List of matching log entries with classification data, sorted by timestamp (newest first)",
    responses={
        200: {
            "description": "Successful search results",
            "content": {
                "application/json": {
                    "examples": {
                        "database_errors": {
                            "summary": "Database error logs",
                            "value": [{
                                "id": "6070643e-1e7d-4c33-9a2e-23a71a9387cc",
                                "timestamp": "2023-08-18T14:35:12.345Z",
                                "service_name": "payment-service",
                                "environment": "production",
                                "level": "ERROR",
                                "message": "Database connection timed out after 30s",
                                "log_type": "database",
                                "log_subtype": "connection_timeout",
                                "confidence_score": 0.95,
                                "entities": {
                                    "db_host": "db-prod-01.example.com",
                                    "timeout": "30s"
                                },
                                "tags": ["database", "timeout", "critical"]
                            }]
                        },
                        "auth_failures": {
                            "summary": "Authentication failures",
                            "value": [{
                                "id": "7182754f-2e8d-5d44-0b3f-34a82b9498dd",
                                "timestamp": "2023-08-19T10:22:45.123Z",
                                "service_name": "auth-service",
                                "environment": "production",
                                "level": "WARN",
                                "message": "Failed login attempt for user johndoe@example.com from IP 192.168.1.234",
                                "log_type": "auth",
                                "log_subtype": "login_failure",
                                "confidence_score": 0.98,
                                "entities": {
                                    "email": "johndoe@example.com",
                                    "ip_address": "192.168.1.234"
                                },
                                "tags": ["auth", "security", "login"]
                            }]
                        },
                        "api_errors": {
                            "summary": "API request errors",
                            "value": [{
                                "id": "8293865g-3f9e-6e55-1c4g-45b93c0509ee",
                                "timestamp": "2023-08-20T08:15:33.987Z",
                                "service_name": "api-gateway",
                                "environment": "production",
                                "level": "ERROR",
                                "message": "Upstream API returned 500 Internal Server Error",
                                "log_type": "request",
                                "log_subtype": "api_error",
                                "confidence_score": 0.91,
                                "entities": {
                                    "status_code": "500",
                                    "url": "https://partner-api.example.com/v2/orders"
                                },
                                "tags": ["api", "gateway", "upstream", "error"]
                            }]
                        }
                    }
                }
            }
        },
        500: {
            "description": "Search operation failed",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error searching logs"
                    }
                }
            }
        }
    }
)
async def search_logs(
    log_type: str = Query(None, description="Filter by log type (e.g., 'database', 'auth', 'request')"),
    log_subtype: str = Query(None, description="Filter by log subtype (e.g., 'connection', 'query', 'login_failure')"),
    tag: str = Query(None, description="Filter by tag"),
    entity_type: str = Query(None, description="Filter by entity type (e.g., 'ip_address', 'email', 'user_id')"),
    entity_value: str = Query(None, description="Filter by entity value"),
    confidence_min: float = Query(0.0, description="Minimum confidence score (0.0-1.0)", ge=0.0, le=1.0),
    service_name: str = Query(None, description="Filter by service name"),
    environment: str = Query(None, description="Filter by environment"),
    start_time: datetime = Query(None, description="Filter logs after this time"),
    end_time: datetime = Query(None, description="Filter logs before this time"),
    limit: int = Query(100, description="Maximum number of logs to return", ge=1, le=1000)
):
    logger.info("🔍 Searching logs by classification criteria")

    # Build filter criteria
    filter_criteria = {}

    # Add classification filters
    if log_type:
        filter_criteria["log_type"] = log_type

    if log_subtype:
        filter_criteria["log_subtype"] = log_subtype

    if tag:
        filter_criteria["tags"] = tag

    if entity_type and entity_value:
        filter_criteria[f"entities.{entity_type}"] = entity_value
    elif entity_type:
        filter_criteria[f"entities.{entity_type}"] = {"$exists": True}

    if confidence_min > 0:
        filter_criteria["confidence_score"] = {"$gte": confidence_min}

    # Add standard filters
    if service_name:
        filter_criteria["service_name"] = service_name

    if environment:
        filter_criteria["environment"] = environment

    # Date range filters
    date_filter = {}
    if start_time:
        date_filter["$gte"] = start_time
    if end_time:
        date_filter["$lte"] = end_time
    if date_filter:
        filter_criteria["timestamp"] = date_filter

    async def fetch_logs():
        cursor = MongoDB.log_entries.find(filter_criteria).sort("timestamp", DESCENDING).limit(limit)
        logs = await cursor.to_list(length=limit)
        formatted_logs = []

        # Convert data to match the schema
        for log in logs:
            log["_id"] = str(log["_id"])
            formatted_logs.append(log)

        return formatted_logs

    try:
        logs = await perform_db_operation(fetch_logs)
        logger.info(f"✅ {len(logs)} classified logs found")
        return logs
    except Exception as e:
        logger.error(f"Error searching logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Error searching logs")

# API Key validation dependency
async def get_api_key(api_key: str = Security(api_key_header)):
    # For demo purposes in Swagger UI, we'll accept any API key
    # In production, you would validate against a database
    if api_key:
        return api_key
    # No API key provided, this would normally raise an error in production
    return None

@app.post("/token", tags=["system"], include_in_schema=True)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Get an OAuth2 access token for use with authenticated endpoints.

    This is a demo endpoint that simulates OAuth2 authentication.
    In a production environment, this would validate credentials against a database
    and use proper token generation and validation.

    For demo purposes:
    - Username can be any value
    - Password should be "watchtower" to get a token
    """
    # In a real app, you would verify the username and password
    # For demo purposes, accept any username with password "watchtower"
    if form_data.password != "watchtower":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In a real app, you would create a proper JWT token
    # For demo, just return a mock token
    return {
        "access_token": "demo_token_" + form_data.username,
        "token_type": "bearer",
        "expires_in": 3600,
        "scope": " ".join(form_data.scopes) if form_data.scopes else "read write"
    }

# Add a new endpoint to fix existing alerts with missing IDs
@app.post(
    "/admin/fix-alerts",
    response_model=dict,
    tags=["system"],
    summary="Fix alerts with missing or invalid IDs",
    description="Administrative endpoint to repair alerts that have missing or invalid IDs in the database.",
)
async def fix_alerts(
    api_key: str = Security(api_key_header)
):
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")

    try:
        # Find alerts with missing _id fields
        async def find_and_fix_alerts():
            # Find alerts without _id field or with null _id
            cursor = MongoDB.alerts.find({"$or": [{"_id": {"$exists": False}}, {"_id": None}]})
            invalid_alerts = await cursor.to_list(length=1000)
            fixed_count = 0

            # Fix each invalid alert
            for alert in invalid_alerts:
                # Generate a new ObjectId
                new_id = ObjectId()

                # Remove the alert without an ID
                await MongoDB.alerts.delete_one({"_id": alert.get("_id")})

                # Insert a new one with a valid ID
                alert["_id"] = new_id
                await MongoDB.alerts.insert_one(alert)
                fixed_count += 1

            return {"fixed_count": fixed_count}

        result = await perform_db_operation(find_and_fix_alerts)
        return {
            "status": "success",
            "message": f"Fixed {result['fixed_count']} alerts with invalid IDs",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fixing alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fixing alerts: {str(e)}")

@app.get(
    "/api/endpoints",
    response_model=list[dict],
    tags=["monitoring"],
    summary="List all registered API endpoints",
    description="Get a list of all API endpoints registered for monitoring.",
    responses={
        200: {
            "description": "Endpoints retrieved successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "_id": "60a6b3c2d4e5f6a7b8c9d0e1",
                            "name": "User Service API",
                            "url": "https://api.example.com/v1/users",
                            "method": "GET",
                            "service": "user-service",
                            "description": "User management API endpoint",
                            "status": "active",
                            "created_at": "2023-08-21T15:45:22.123Z",
                            "last_checked": "2023-08-21T15:45:22.123Z"
                        }
                    ]
                }
            }
        }
    }
)
async def get_endpoints():
    """Get all registered API endpoints for monitoring."""
    logger.info("📋 Retrieving registered endpoints")

    async def fetch_endpoints():
        cursor = MongoDB.api_endpoints.find()
        endpoints = await cursor.to_list(length=100)

        # Format the endpoints
        formatted_endpoints = []
        for endpoint in endpoints:
            endpoint["_id"] = str(endpoint["_id"])
            formatted_endpoints.append(endpoint)

        return formatted_endpoints

    try:
        endpoints = await perform_db_operation(fetch_endpoints)
        logger.info(f"✅ Retrieved {len(endpoints)} endpoints")
        return endpoints
    except Exception as e:
        logger.error(f"Error fetching endpoints: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving endpoints")

@app.post(
    "/api/endpoints",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    tags=["monitoring"],
    summary="Register a new API endpoint",
    description="Register a new API endpoint for monitoring.",
    responses={
        201: {
            "description": "Endpoint registered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "_id": "60a6b3c2d4e5f6a7b8c9d0e1",
                        "name": "User Service API",
                        "url": "https://api.example.com/v1/users",
                        "method": "GET",
                        "service": "user-service",
                        "description": "User management API endpoint",
                        "status": "active",
                        "created_at": "2023-08-21T15:45:22.123Z"
                    }
                }
            }
        }
    }
)
async def create_endpoint(
    name: str = Body(..., description="Name of the endpoint"),
    url: str = Body(..., description="URL of the endpoint"),
    method: str = Body("GET", description="HTTP method (GET, POST, etc.)"),
    service: str = Body(None, description="Service this endpoint belongs to"),
    description: str = Body(None, description="Description of what this endpoint does")
):
    """Register a new API endpoint for monitoring."""
    logger.info(f"➕ Registering new endpoint: {name} - {url}")

    timestamp = datetime.utcnow()

    # Create the endpoint document
    endpoint = {
        "name": name,
        "url": url,
        "method": method,
        "service": service,
        "description": description,
        "status": "active",
        "created_at": timestamp,
        "last_checked": timestamp
    }

    async def create_endpoint_op():
        result = await MongoDB.api_endpoints.insert_one(endpoint)
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to register endpoint")

        # Return the newly created endpoint
        endpoint["_id"] = str(result.inserted_id)
        return endpoint

    try:
        new_endpoint = await perform_db_operation(create_endpoint_op)
        logger.info(f"✅ Endpoint registered: {name}")
        return new_endpoint
    except Exception as e:
        logger.error(f"Error registering endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error registering endpoint: {str(e)}")

@app.get(
    "/api/endpoints/{endpoint_id}",
    response_model=dict,
    tags=["monitoring"],
    summary="Get a specific API endpoint",
    description="Get details of a specific registered API endpoint.",
    responses={
        200: {
            "description": "Endpoint retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "_id": "60a6b3c2d4e5f6a7b8c9d0e1",
                        "name": "User Service API",
                        "url": "https://api.example.com/v1/users",
                        "method": "GET",
                        "service": "user-service",
                        "description": "User management API endpoint",
                        "status": "active",
                        "created_at": "2023-08-21T15:45:22.123Z",
                        "last_checked": "2023-08-21T15:45:22.123Z"
                    }
                }
            }
        },
        404: {
            "description": "Endpoint not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Endpoint not found"
                    }
                }
            }
        }
    }
)
async def get_endpoint(endpoint_id: str):
    """Get a specific registered API endpoint."""
    logger.info(f"🔍 Retrieving endpoint: {endpoint_id}")

    try:
        object_id = ObjectId(endpoint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid endpoint ID format")

    async def fetch_endpoint():
        endpoint = await MongoDB.api_endpoints.find_one({"_id": object_id})
        if not endpoint:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        endpoint["_id"] = str(endpoint["_id"])
        return endpoint

    try:
        endpoint = await perform_db_operation(fetch_endpoint)
        return endpoint
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving endpoint: {str(e)}")

@app.put(
    "/api/endpoints/{endpoint_id}",
    response_model=dict,
    tags=["monitoring"],
    summary="Update an API endpoint",
    description="Update the details of a registered API endpoint.",
    responses={
        200: {
            "description": "Endpoint updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "_id": "60a6b3c2d4e5f6a7b8c9d0e1",
                        "name": "Updated Service API",
                        "url": "https://api.example.com/v2/users",
                        "method": "GET",
                        "service": "user-service",
                        "description": "Updated user management API endpoint",
                        "status": "active",
                        "created_at": "2023-08-21T15:45:22.123Z",
                        "updated_at": "2023-08-21T16:30:45.678Z"
                    }
                }
            }
        },
        404: {
            "description": "Endpoint not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Endpoint not found"
                    }
                }
            }
        }
    }
)
async def update_endpoint(
    endpoint_id: str,
    name: str = Body(None, description="Name of the endpoint"),
    url: str = Body(None, description="URL of the endpoint"),
    method: str = Body(None, description="HTTP method (GET, POST, etc.)"),
    service: str = Body(None, description="Service this endpoint belongs to"),
    description: str = Body(None, description="Description of what this endpoint does"),
    status: str = Body(None, description="Status of the endpoint (active, inactive)")
):
    """Update a registered API endpoint."""
    logger.info(f"✏️ Updating endpoint: {endpoint_id}")

    try:
        object_id = ObjectId(endpoint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid endpoint ID format")

    # Build update document
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if url is not None:
        update_data["url"] = url
    if method is not None:
        update_data["method"] = method
    if service is not None:
        update_data["service"] = service
    if description is not None:
        update_data["description"] = description
    if status is not None:
        update_data["status"] = status

    # Add timestamp
    update_data["updated_at"] = datetime.utcnow()

    async def update_endpoint_op():
        result = await MongoDB.api_endpoints.update_one(
            {"_id": object_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        # Return the updated endpoint
        updated_endpoint = await MongoDB.api_endpoints.find_one({"_id": object_id})
        updated_endpoint["_id"] = str(updated_endpoint["_id"])
        return updated_endpoint

    try:
        updated = await perform_db_operation(update_endpoint_op)
        logger.info(f"✅ Endpoint updated: {endpoint_id}")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating endpoint: {str(e)}")

@app.delete(
    "/api/endpoints/{endpoint_id}",
    response_model=dict,
    tags=["monitoring"],
    summary="Delete an API endpoint",
    description="Remove a registered API endpoint from monitoring.",
    responses={
        200: {
            "description": "Endpoint deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Endpoint deleted successfully",
                        "id": "60a6b3c2d4e5f6a7b8c9d0e1"
                    }
                }
            }
        },
        404: {
            "description": "Endpoint not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Endpoint not found"
                    }
                }
            }
        }
    }
)
async def delete_endpoint(endpoint_id: str):
    """Delete a registered API endpoint."""
    logger.info(f"🗑️ Deleting endpoint: {endpoint_id}")

    try:
        object_id = ObjectId(endpoint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid endpoint ID format")

    async def delete_endpoint_op():
        result = await MongoDB.api_endpoints.delete_one({"_id": object_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        return {"message": "Endpoint deleted successfully", "id": endpoint_id}

    try:
        result = await perform_db_operation(delete_endpoint_op)
        logger.info(f"✅ Endpoint deleted: {endpoint_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting endpoint: {str(e)}")

@app.post(
    "/api/endpoints/{endpoint_id}/ping",
    response_model=dict,
    tags=["monitoring"],
    summary="Ping an API endpoint",
    description="Send a request to a monitored API endpoint and record the result.",
    responses={
        200: {
            "description": "Endpoint pinged successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Endpoint pinged successfully",
                        "id": "60a6b3c2d4e5f6a7b8c9d0e1",
                        "status_code": 200,
                        "response_time_ms": 123.45
                    }
                }
            }
        },
        404: {
            "description": "Endpoint not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Endpoint not found"
                    }
                }
            }
        }
    }
)
async def ping_endpoint(
    endpoint_id: str,
    background_tasks: BackgroundTasks
):
    """Ping a registered API endpoint and record the result."""
    logger.info(f"🔔 Pinging endpoint: {endpoint_id}")

    try:
        object_id = ObjectId(endpoint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid endpoint ID format")

    async def get_endpoint_data():
        endpoint = await MongoDB.api_endpoints.find_one({"_id": object_id})
        if not endpoint:
            raise HTTPException(status_code=404, detail="Endpoint not found")
        return endpoint

    try:
        endpoint = await perform_db_operation(get_endpoint_data)

        # Update last checked timestamp
        await MongoDB.api_endpoints.update_one(
            {"_id": object_id},
            {"$set": {"last_checked": datetime.utcnow()}}
        )

        # Ping the endpoint in the background
        background_tasks.add_task(
            perform_endpoint_ping,
            endpoint_id,
            endpoint["url"],
            endpoint.get("method", "GET"),
            endpoint.get("service")
        )

        return {
            "message": "Endpoint ping initiated",
            "id": str(endpoint["_id"]),
            "url": endpoint["url"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pinging endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error pinging endpoint: {str(e)}")

async def perform_endpoint_ping(endpoint_id, url, method="GET", service=None):
    """Perform the actual HTTP request to an endpoint and record the results."""
    import httpx
    import time

    start_time = time.time()
    status_code = None
    error_message = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method.upper() == "GET":
                response = await client.get(url)
            elif method.upper() == "POST":
                response = await client.post(url)
            elif method.upper() == "PUT":
                response = await client.put(url)
            elif method.upper() == "DELETE":
                response = await client.delete(url)
            else:
                response = await client.request(method, url)

            response_time = time.time() - start_time
            status_code = response.status_code

            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text[:1000]}

            # Record the ping result
            ping_result = {
                "endpoint_id": endpoint_id,
                "url": url,
                "method": method,
                "service": service,
                "timestamp": datetime.utcnow(),
                "response_time_ms": round(response_time * 1000, 2),
                "status_code": status_code,
                "response_data": response_data,
                "success": status_code < 400,
                "error": None
            }

            await MongoDB.endpoint_pings.insert_one(ping_result)

            # Update endpoint status based on ping result
            status = "active" if status_code < 400 else "error"
            await MongoDB.api_endpoints.update_one(
                {"_id": ObjectId(endpoint_id)},
                {"$set": {
                    "status": status,
                    "last_status_code": status_code,
                    "last_response_time_ms": round(response_time * 1000, 2),
                    "last_checked": datetime.utcnow()
                }}
            )

            logger.info(f"✅ Endpoint {endpoint_id} pinged successfully: {status_code} in {round(response_time * 1000, 2)}ms")

    except Exception as e:
        error_message = str(e)
        logger.error(f"❌ Error pinging endpoint {endpoint_id}: {error_message}")

        # Record the failed ping
        ping_result = {
            "endpoint_id": endpoint_id,
            "url": url,
            "method": method,
            "service": service,
            "timestamp": datetime.utcnow(),
            "response_time_ms": round((time.time() - start_time) * 1000, 2),
            "status_code": None,
            "response_data": None,
            "success": False,
            "error": error_message
        }

        await MongoDB.endpoint_pings.insert_one(ping_result)

        # Update endpoint status to error
        await MongoDB.api_endpoints.update_one(
            {"_id": ObjectId(endpoint_id)},
            {"$set": {
                "status": "error",
                "last_error": error_message,
                "last_checked": datetime.utcnow()
            }}
        )

# This should be the last route defined - it captures all undefined routes
@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    include_in_schema=True,
    tags=["monitoring"],
    summary="Universal API monitoring endpoint",
    description="""
    Universal endpoint that captures any request to any undefined path.

    This powerful feature allows WatchTowerAI to monitor ANY endpoint with ANY data structure without explicit configuration:

    * Captures full request details (method, path, headers, query params, body)
    * Logs the request with service attribution
    * Processes and classifies the captured data automatically
    * Applies AI analysis to detect anomalies
    * Generates alerts for suspicious patterns

    To use this feature, simply:
    1. Direct traffic to any undefined path on this server
    2. Add a `service_name` query parameter to identify the source
    3. Let the system handle the rest!

    This is ideal for:
    * Monitoring third-party APIs
    * Adding observability to legacy systems
    * Quick integration without modifying existing services
    * Capturing ad-hoc testing traffic
    """,
    responses={
        200: {
            "description": "Request successfully captured and stored",
            "content": {
                "application/json": {
                    "examples": {
                        "rest_api": {
                            "summary": "REST API request capture",
                            "value": {
                                "message": "Request received and stored for monitoring",
                                "path": "api/v1/users",
                                "method": "GET",
                                "timestamp": "2023-08-21T15:45:22.123Z",
                                "service": "user-service"
                            }
                        },
                        "webhook": {
                            "summary": "Webhook payload capture",
                            "value": {
                                "message": "Request received and stored for monitoring",
                                "path": "webhooks/payment-callback",
                                "method": "POST",
                                "timestamp": "2023-08-21T15:48:35.789Z",
                                "service": "payment-gateway"
                            }
                        },
                        "graphql": {
                            "summary": "GraphQL query capture",
                            "value": {
                                "message": "Request received and stored for monitoring",
                                "path": "graphql",
                                "method": "POST",
                                "timestamp": "2023-08-21T15:50:12.456Z",
                                "service": "content-api"
                            }
                        }
                    }
                }
            }
        },
        500: {
            "description": "Error processing the request",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Error processing request for monitoring",
                        "error": "Failed to process request body"
                    }
                }
            }
        }
    }
)
async def catch_all(
    request: Request,
    path: str,
    background_tasks: BackgroundTasks,
    service_name: str = Query(None, description="Name of the service this endpoint belongs to")
):
    """
    Universal endpoint that captures any request to any undefined path.
    This allows monitoring of any endpoint, regardless of the data structure.
    """
    logger.info(f"Captured request to undefined path: {path}")

    # Determine method and construct URL
    method = request.method
    url = str(request.url)

    # Get headers and query params
    headers = dict(request.headers)
    query_params = dict(request.query_params)

    # Get extracted service name from query or use the path as a fallback
    extracted_service = service_name or path.split('/')[0] or "unknown_service"

    # Get the request body for methods that might have one
    body = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                body = await request.json()
            elif "application/x-www-form-urlencoded" in content_type:
                form = await request.form()
                body = dict(form)
            elif "multipart/form-data" in content_type:
                form = await request.form()
                body = dict(form)
            else:
                text = await request.body()
                body = {"raw": str(text)}
        except Exception as e:
            logger.warning(f"Error reading request body: {str(e)}")
            body = {"error": "Could not parse request body"}

    # Create timestamp
    timestamp = datetime.utcnow()

    # Create a log entry from this request
    message = f"{method} request to {path}"

    # Create structured payload
    raw_payload = {
        "method": method,
        "url": url,
        "path": path,
        "headers": headers,
        "query_params": query_params,
        "body": body,
        "timestamp": timestamp.isoformat()
    }

    try:
        # Create new log entry
        new_log = LogEntry(
            timestamp=timestamp,
            service_name=extracted_service,
            environment=query_params.get("environment", "production"),
            level="INFO",  # Default level
            message=message,
            correlation_id=headers.get("x-correlation-id") or headers.get("x-request-id"),
            raw_payload=raw_payload
        )

        # Insert into MongoDB - improved approach: exclude ID fields and let MongoDB generate one
        log_dict = new_log.model_dump(exclude={"id", "_id"}, by_alias=True)

        async def insert_log():
            result = await MongoDB.log_entries.insert_one(log_dict)
            if not result.inserted_id:
                logger.error("Failed to insert catch-all log")
                return None

            # Fetch the inserted document
            document = await MongoDB.log_entries.find_one({"_id": result.inserted_id})
            return document

        inserted_doc = await perform_db_operation(insert_log)

        if inserted_doc:
            # Process the log in background
            background_tasks.add_task(process_log, new_log)
            logger.info(f"✅ Captured and stored request to {path}")

        # Always return a basic acknowledgement for any request
        return JSONResponse(
            content={
                "message": "Request received and stored for monitoring",
                "path": path,
                "method": method,
                "timestamp": timestamp.isoformat(),
                "service": extracted_service
            },
            status_code=200
        )

    except Exception as e:
        logger.error(f"Error processing catch-all request: {str(e)}")
        return JSONResponse(
            content={
                "message": "Error processing request for monitoring",
                "error": str(e)
            },
            status_code=500
        )
