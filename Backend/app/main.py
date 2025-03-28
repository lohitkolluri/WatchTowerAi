import logging
from datetime import datetime
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db, engine
from .models import Base, LogEntryModel, AlertModel, MetricModel
from .schemas import LogEntryCreate, LogEntryRead, AlertRead, AlertUpdate, MetricRead
from .services.log_processor import process_log
from contextlib import asynccontextmanager

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("watchtower-ai")

@asynccontextmanager
async def lifespan(app):
    logger.info("🚀 Starting up WatchTowerAI and initializing DB...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables ensured.")
    yield
    logger.info("🛑 WatchTowerAI is shutting down.")

app = FastAPI(
    title="WatchTowerAI",
    description="Production-ready backend for AI-powered API monitoring and alerting (WatchTowerAI).",
    version="1.0.0",
    lifespan=lifespan
)

@app.post("/ingest", response_model=LogEntryRead, status_code=status.HTTP_201_CREATED)
async def ingest_log(
    log: LogEntryCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"📥 Ingesting log from {log.service_name} [{log.level}]")
    new_log = LogEntryModel(
        timestamp=log.timestamp,
        service_name=log.service_name,
        environment=log.environment,
        level=log.level,
        message=log.message,
        error_code=log.error_code,
        correlation_id=log.correlation_id,
    )
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)
    background_tasks.add_task(process_log, log, db)
    logger.info("✅ Log stored and processing triggered")
    return new_log

@app.get("/logs", response_model=list[LogEntryRead])
async def get_logs(
    service_name: str = Query(None),
    environment: str = Query(None),
    level: str = Query(None),
    start_time: datetime = Query(None),
    end_time: datetime = Query(None),
    db: AsyncSession = Depends(get_db)
):
    logger.info("📄 Retrieving logs with filters")
    query = select(LogEntryModel)
    if service_name:
        query = query.where(LogEntryModel.service_name == service_name)
    if environment:
        query = query.where(LogEntryModel.environment == environment)
    if level:
        query = query.where(LogEntryModel.level == level)
    if start_time:
        query = query.where(LogEntryModel.timestamp >= start_time)
    if end_time:
        query = query.where(LogEntryModel.timestamp <= end_time)
    result = await db.execute(query)
    logs = result.scalars().all()
    logger.info(f"✅ {len(logs)} logs fetched")
    return logs

@app.get("/alerts", response_model=list[AlertRead])
async def get_alerts(
    service_name: str = Query(None),
    environment: str = Query(None),
    acknowledged: bool = Query(None),
    db: AsyncSession = Depends(get_db)
):
    logger.info("🚨 Fetching alerts...")
    query = select(AlertModel)
    if service_name:
        query = query.where(AlertModel.service_name == service_name)
    if environment:
        query = query.where(AlertModel.environment == environment)
    if acknowledged is not None:
        query = query.where(AlertModel.acknowledged == acknowledged)
    result = await db.execute(query)
    alerts = result.scalars().all()
    logger.info(f"✅ {len(alerts)} alerts returned")
    return alerts

@app.patch("/alerts/{alert_id}", response_model=AlertRead)
async def update_alert(alert_id: str, update: AlertUpdate, db: AsyncSession = Depends(get_db)):
    logger.info(f"📝 Acknowledging alert: {alert_id}")
    result = await db.execute(select(AlertModel).where(AlertModel.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        logger.warning("❌ Alert not found")
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = update.acknowledged
    await db.commit()
    await db.refresh(alert)
    logger.info("✅ Alert updated")
    return alert

@app.get("/metrics", response_model=list[MetricRead])
async def get_metrics(db: AsyncSession = Depends(get_db)):
    logger.info("📊 Retrieving metrics...")
    result = await db.execute(select(MetricModel))
    metrics = result.scalars().all()
    logger.info(f"✅ {len(metrics)} metric entries returned")
    return metrics

@app.get("/documentation", response_class=HTMLResponse, include_in_schema=False)
async def custom_documentation():
    logger.info("📘 Serving static documentation page")
    html_content = """
    <html>
      <head>
        <title>WatchTowerAI Documentation</title>
      </head>
      <body>
        <h1>WatchTowerAI API Documentation</h1>
        <p>For full interactive API docs, visit <a href='/docs'>Swagger UI</a>.</p>
        <h2>Endpoints</h2>
        <ul>
          <li><strong>POST /ingest</strong>: Ingest a log entry and trigger analysis.</li>
          <li><strong>GET /logs</strong>: Retrieve logs with filters.</li>
          <li><strong>GET /alerts</strong>: Retrieve alerts with filtering options.</li>
          <li><strong>PATCH /alerts/{alert_id}</strong>: Update (acknowledge) an alert.</li>
          <li><strong>GET /metrics</strong>: Retrieve aggregated metrics.</li>
        </ul>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)
