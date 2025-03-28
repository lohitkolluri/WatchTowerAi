import logging
from pymongo.errors import PyMongoError
import asyncio
from ..schemas import LogEntryCreate
from ..models import Alert
from ..database import MongoDB, perform_db_operation
from datetime import datetime
from .gemini import call_gemini_api
from .email_alert import send_email_alert

logger = logging.getLogger(__name__)

async def process_log(log: LogEntryCreate) -> None:
    """
    Process a log entry:
    1. Analyze it for potential issues
    2. Generate AI remediation if needed
    3. Create alerts for critical issues
    4. Send email notifications for high-severity issues
    """
    logger.info(f"Processing log from {log.service_name}")

    # Determine if this log requires an alert (simple logic for now)
    needs_alert = log.level in ["ERROR", "CRITICAL", "FATAL"]

    if needs_alert:
        # Get remediation suggestion from Gemini
        remediation = await call_gemini_api(log)

        # Create an alert record with retry logic
        max_retries = 3
        retry_delay = 0.5

        # Create alert document
        new_alert = Alert(
            service_name=log.service_name,
            environment=log.environment,
            level=log.level,
            message=log.message,
            correlation_id=log.correlation_id,
            remediation=remediation,
            timestamp=datetime.now(),
            acknowledged=False
        )

        alert_dict = new_alert.model_dump(by_alias=True)  # Updated to use model_dump() instead of dict()

        # Insert the alert with retry logic
        async def insert_alert():
            result = await MongoDB.alerts.insert_one(alert_dict)
            if result.inserted_id:
                logger.info(f"Alert created for {log.service_name} in {log.environment}")
                return True
            return False

        try:
            await perform_db_operation(insert_alert)
        except PyMongoError as e:
            logger.error(f"Failed to create alert: {e}")

        # For high-severity issues, send an email alert
        # Changed to include ERROR level as well
        if log.level in ["ERROR", "CRITICAL", "FATAL"]:  # Now includes ERROR
            logger.info(f"Sending email alert for {log.level} issue")

            # Use the new template-based email alert function
            try:
                await send_email_alert(
                    subject=f"🚨 Alert: {log.level} in {log.service_name} ({log.environment})",
                    template_name="alert_email.html",
                    context={
                        "service_name": log.service_name,
                        "environment": log.environment,
                        "level": log.level,
                        "message": log.message,
                        "remediation": remediation or "No remediation available",
                        "timestamp": str(log.timestamp),
                        "correlation_id": log.correlation_id or "N/A",
                    }
                )
                logger.info(f"📧 Email alert sent for {log.service_name} {log.level}")
            except Exception as e:
                logger.error(f"Failed to send email alert: {e}")
    else:
        logger.info(f"No alert needed for {log.level} log")

    # Update metrics collection
    await update_metrics(log.service_name, log.environment, log.level)

    logger.info("✅ Log processing complete")

async def update_metrics(service_name: str, environment: str, level: str):
    """Update metrics for this service and environment"""
    filter_criteria = {
        "service_name": service_name,
        "environment": environment
    }

    update_data = {
        "$inc": {
            "total": 1
        },
        "$set": {
            "updated_at": datetime.utcnow()
        }
    }

    # Increment error count if this is an error log
    if level in ["ERROR", "CRITICAL", "FATAL"]:
        update_data["$inc"]["errors"] = 1

    async def upsert_metrics():
        await MongoDB.metrics.update_one(
            filter_criteria,
            update_data,
            upsert=True
        )

    try:
        await perform_db_operation(upsert_metrics)
    except PyMongoError as e:
        logger.error(f"Failed to update metrics: {e}")
