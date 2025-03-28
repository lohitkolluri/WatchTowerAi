import logging
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from .database import MongoDB, connect_to_mongo, close_mongo_connection, perform_db_operation
from .models import LogEntry, Alert, Metric
from .schemas import LogEntryCreate, LogEntryRead, AlertRead, AlertUpdate, MetricRead
from .services.log_processor import process_log
from contextlib import asynccontextmanager
import asyncio
from bson import ObjectId

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("watchtower-ai")

@asynccontextmanager
async def lifespan(app):
    logger.info("🚀 Starting up WatchTowerAI and connecting to MongoDB...")
    await connect_to_mongo()
    logger.info("✅ MongoDB connection established.")
    yield
    logger.info("🛑 WatchTowerAI is shutting down.")
    await close_mongo_connection()

app = FastAPI(
    title="WatchTowerAI API",
    description="""
    ## 🚨 WatchTowerAI Backend API

    AI-powered API monitoring and alerting system that detects and predicts anomalies in your services.

    ### Key Features

    * Real-time log ingestion and processing
    * AI-powered anomaly detection with Google Gemini
    * Automated alert generation and tracking
    * Email notifications for critical issues
    * Service metrics aggregation and monitoring

    ### Authentication

    Currently using API key authentication. Include your API key in the `X-API-Key` header for production deployments.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    contact={
        "name": "WatchTowerAI Support",
        "email": "support@watchtowerai.example.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    }
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    summary="Ingest a new log entry",
    description="""
    Submit a log entry to be processed and analyzed.

    The system will:
    1. Store the log entry in the database
    2. Process it in the background for potential issues
    3. Generate alerts if needed
    4. Send email notifications for critical issues
    """,
    response_description="The created log entry with its assigned ID"
)
async def ingest_log(log: LogEntryCreate, background_tasks: BackgroundTasks):
    logger.info(f"📥 Ingesting log from {log.service_name} [{log.level}]")

    try:
        # Create new log entry document
        new_log = LogEntry(
            timestamp=log.timestamp,
            service_name=log.service_name,
            environment=log.environment,
            level=log.level,
            message=log.message,
            error_code=log.error_code,
            correlation_id=log.correlation_id,
        )

        # Insert into MongoDB
        log_dict = new_log.model_dump(by_alias=True)  # Use model_dump instead of dict
        # Make sure id is a string
        if "_id" not in log_dict and "id" in log_dict:
            log_dict["_id"] = log_dict.pop("id")

        async def insert_log():
            result = await MongoDB.log_entries.insert_one(log_dict)
            if not result.inserted_id:
                raise HTTPException(status_code=500, detail="Failed to insert log")

            # Fetch the inserted document for the response
            document = await MongoDB.log_entries.find_one({"_id": result.inserted_id})
            if not document:
                raise HTTPException(status_code=500, detail="Failed to retrieve inserted document")

            return document

        inserted_doc = await perform_db_operation(insert_log)

        # Process log in background
        background_tasks.add_task(process_log, log)
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
    response_model=list[LogEntryRead],
    tags=["logs"],
    summary="Retrieve log entries",
    description="Get log entries with optional filtering by service, environment, level, and time range.",
    response_description="List of matching log entries, sorted by timestamp (newest first)"
)
async def get_logs(
    service_name: str = Query(None, description="Filter by service name"),
    environment: str = Query(None, description="Filter by environment (dev/staging/production)"),
    level: str = Query(None, description="Filter by log level (INFO/WARN/ERROR)"),
    start_time: datetime = Query(None, description="Filter logs after this time"),
    end_time: datetime = Query(None, description="Filter logs before this time")
):
    logger.info("📄 Retrieving logs with filters")

    # Build filter criteria
    filter_criteria = {}
    if service_name:
        filter_criteria["service_name"] = service_name
    if environment:
        filter_criteria["environment"] = environment
    if level:
        filter_criteria["level"] = level

    # Date range filters
    date_filter = {}
    if start_time:
        date_filter["$gte"] = start_time
    if end_time:
        date_filter["$lte"] = end_time
    if date_filter:
        filter_criteria["timestamp"] = date_filter

    async def fetch_logs():
        cursor = MongoDB.log_entries.find(filter_criteria).sort("timestamp", DESCENDING)
        logs = await cursor.to_list(length=100)  # Limit to 100 logs
        return logs

    logs = await perform_db_operation(fetch_logs)
    logger.info(f"✅ {len(logs)} logs fetched")
    return logs

@app.get(
    "/alerts",
    response_model=list[AlertRead],
    tags=["alerts"],
    summary="Retrieve alerts",
    description="Get alerts with optional filtering by service, environment, and acknowledgment status.",
    response_description="List of matching alerts, sorted by timestamp (newest first)"
)
async def get_alerts(
    service_name: str = Query(None, description="Filter by service name"),
    environment: str = Query(None, description="Filter by environment (dev/staging/production)"),
    acknowledged: bool = Query(None, description="Filter by acknowledgment status")
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

    async def fetch_alerts():
        cursor = MongoDB.alerts.find(filter_criteria).sort("timestamp", DESCENDING)
        alerts = await cursor.to_list(length=100)
        return alerts

    alerts = await perform_db_operation(fetch_alerts)
    logger.info(f"✅ {len(alerts)} alerts returned")
    return alerts

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

    async def update_alert_op():
        result = await MongoDB.alerts.update_one(
            {"id": alert_id},
            {"$set": {"acknowledged": update.acknowledged}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")

        updated_alert = await MongoDB.alerts.find_one({"id": alert_id})
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
    response_description="List of service metrics including error counts and totals"
)
async def get_metrics():
    logger.info("📊 Retrieving metrics...")

    async def fetch_metrics():
        cursor = MongoDB.metrics.find()
        metrics = await cursor.to_list(length=100)
        return metrics

    metrics = await perform_db_operation(fetch_metrics)
    logger.info(f"✅ {len(metrics)} metric entries returned")
    return metrics

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
        </style>
      </head>
      <body>
        <h1>WatchTowerAI API Documentation</h1>
        <p>For full interactive API docs, visit <a href='/docs'>Swagger UI</a>.</p>

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
          <p><span class="method">GET</span> <code>/health</code></p>
          <p>Simple health check endpoint.</p>
        </div>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)
