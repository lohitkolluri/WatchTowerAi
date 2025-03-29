import logging
from pymongo.errors import PyMongoError
import asyncio
from bson import ObjectId
from ..schemas import LogEntryCreate
from ..models import Alert
from ..database import MongoDB, perform_db_operation
from datetime import datetime
from .gemini import call_gemini_api
from .email_alert import send_email_alert
from .log_classifier import classify_log

logger = logging.getLogger(__name__)

async def process_log(log) -> None:
    """
    Process a log entry:
    1. Classify the log type and extract entities
    2. Analyze it for potential issues
    3. Generate AI remediation if needed
    4. Create alerts for critical issues
    5. Send email notifications for high-severity issues
    """
    logger.info(f"Processing log from {log.service_name}")

    # Convert log to dictionary for classification
    log_dict = {}
    try:
        log_dict = log.model_dump() if hasattr(log, "model_dump") else vars(log)
    except Exception as e:
        logger.warning(f"Error converting log to dict: {e}, using manual conversion")
        # Manual fallback extraction
        log_dict = {
            "service_name": getattr(log, "service_name", "unknown"),
            "environment": getattr(log, "environment", "production"),
            "level": getattr(log, "level", "INFO"),
            "message": getattr(log, "message", ""),
            "error_code": getattr(log, "error_code", None),
            "correlation_id": getattr(log, "correlation_id", None),
            "raw_payload": getattr(log, "raw_payload", None)
        }

    # Classify the log
    try:
        log_type, log_subtype, confidence_score, entities, tags = await classify_log(log_dict)

        # Update the log entry with classification data
        log_id = getattr(log, "id", None)
        if log_id:
            update_data = {
                "$set": {
                    "log_type": log_type,
                    "log_subtype": log_subtype,
                    "confidence_score": confidence_score,
                    "entities": entities,
                    "tags": tags
                }
            }

            await MongoDB.log_entries.update_one({"_id": log_id}, update_data)
            logger.info(f"Log classified as {log_type}/{log_subtype} with confidence {confidence_score:.2f}")
    except Exception as e:
        logger.error(f"Error classifying log: {e}")
        log_type = "unknown"
        log_subtype = "unknown"

    # Determine if this log requires an alert (simple logic for now)
    needs_alert = log.level in ["ERROR", "CRITICAL", "FATAL"]

    if needs_alert:
        # Get remediation suggestion from Gemini
        remediation = await call_gemini_api(log)

        # Create alert document - let MongoDB generate the _id
        new_alert = Alert(
            timestamp=datetime.now(),
            service_name=log.service_name,
            environment=log.environment,
            level=log.level,
            message=log.message,
            correlation_id=log.correlation_id,
            remediation=remediation,
            acknowledged=False,
            log_type=log_type,
            log_subtype=log_subtype
        )

        # Always exclude id and _id fields to ensure MongoDB generates a proper ObjectId
        alert_dict = new_alert.model_dump(exclude={"id", "_id"}, by_alias=True)

        # Insert the alert with retry logic
        async def insert_alert():
            result = await MongoDB.alerts.insert_one(alert_dict)
            if result.inserted_id:
                logger.info(f"Alert created for {log.service_name} in {log.environment} with ID: {result.inserted_id}")
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
                        "log_type": log_type,
                        "log_subtype": log_subtype
                    }
                )
                logger.info(f"📧 Email alert sent for {log.service_name} {log.level}")
            except Exception as e:
                logger.error(f"Failed to send email alert: {e}")
    else:
        logger.info(f"No alert needed for {log.level} log")

    # Update metrics collection
    await update_metrics(log.service_name, log.environment, log.level, log_type, log_subtype)

    logger.info("✅ Log processing complete")

async def update_metrics(service_name: str, environment: str, level: str, log_type: str = None, log_subtype: str = None):
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

    # Track metrics by log type if available
    if log_type and log_type != "unknown":
        update_data["$inc"][f"log_types.{log_type}"] = 1

        # Track subtype metrics if available
        if log_subtype and log_subtype != "unknown" and log_subtype != "general":
            update_data["$inc"][f"log_subtypes.{log_type}.{log_subtype}"] = 1

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
