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

# Replace standard logging with Loguru
from loguru import logger

# Remove standard logger
# logger = logging.getLogger(__name__)

async def process_log(log) -> None:
    """
    Process a log entry:
    1. Classify the log type and extract entities
    2. Analyze it for potential issues
    3. Generate AI remediation if needed
    4. Create alerts for critical issues
    5. Send email notifications for high-severity issues
    """
    try:
        logger.debug(f"Starting log processing for log: {log}")

        # Convert log to dictionary for processing
        log_dict = {}
        try:
            if isinstance(log, dict):
                log_dict = log
            else:
                log_dict = log.model_dump() if hasattr(log, "model_dump") else vars(log)
            logger.debug(f"Converted log to dictionary: {log_dict}")
        except Exception as e:
            logger.warning(f"Error converting log to dict: {e}, using manual conversion")
            # Manual fallback extraction
            log_dict = {
                "service_name": getattr(log, "service_name", "unknown") if not isinstance(log, dict) else log.get("service_name", "unknown"),
                "environment": getattr(log, "environment", "production") if not isinstance(log, dict) else log.get("environment", "production"),
                "level": getattr(log, "level", "INFO") if not isinstance(log, dict) else log.get("level", "INFO"),
                "message": getattr(log, "message", "") if not isinstance(log, dict) else log.get("message", ""),
                "error_code": getattr(log, "error_code", None) if not isinstance(log, dict) else log.get("error_code"),
                "correlation_id": getattr(log, "correlation_id", None) if not isinstance(log, dict) else log.get("correlation_id"),
                "raw_payload": getattr(log, "raw_payload", None) if not isinstance(log, dict) else log.get("raw_payload")
            }
            logger.debug(f"Using fallback dictionary: {log_dict}")

        # Get the log ID if available
        log_id = None
        if isinstance(log, dict):
            log_id = log.get("_id")
            if isinstance(log_id, str):
                try:
                    log_id = ObjectId(log_id)
                except Exception as e:
                    logger.warning(f"Failed to convert log ID to ObjectId: {e}")
                    # Continue processing without ID - it will be assigned by MongoDB
        else:
            log_id = getattr(log, "_id", None)

        # Validate required fields
        if not log_dict.get("service_name"):
            logger.warning("Missing service_name in log, using 'unknown_service'")
            log_dict["service_name"] = "unknown_service"

        if not log_dict.get("environment"):
            logger.warning("Missing environment in log, using 'production'")
            log_dict["environment"] = "production"

        if not log_dict.get("level"):
            logger.warning("Missing level in log, using 'INFO'")
            log_dict["level"] = "INFO"

        if not log_dict.get("message"):
            logger.warning("Missing message in log, using 'No message provided'")
            log_dict["message"] = "No message provided"

        # Classify the log
        try:
            logger.debug("Starting log classification")
            classification_result = await classify_log(log_dict)
            log_type, log_subtype, confidence_score, entities, tags = classification_result
            logger.debug(f"Classification complete - Type: {log_type}, Subtype: {log_subtype}, Score: {confidence_score}")

            # Update the log document if we have an ID
            if log_id:
                try:
                    update_data = {
                        "$set": {
                            "log_type": log_type,
                            "log_subtype": log_subtype,
                            "confidence_score": confidence_score,
                            "entities": entities,
                            "tags": tags
                        }
                    }
                    logger.debug(f"Updating log {log_id} with data: {update_data}")

                    # Update the document
                    async def update_log():
                        result = await MongoDB.log_entries.update_one({"_id": log_id}, update_data)
                        if result.modified_count > 0:
                            logger.info(f"Log {log_id} classified with confidence {confidence_score:.2f}")
                        else:
                            logger.warning(f"Log update had no effect for ID {log_id}")
                        return result.modified_count > 0

                    success = await perform_db_operation(update_log)
                    if not success:
                        logger.warning(f"Failed to update log {log_id} with classification")
                except Exception as e:
                    logger.error(f"Error updating log classification: {e}")
            else:
                logger.debug("No log ID available for update - classification will be stored with alert if generated")
        except Exception as e:
            logger.error(f"Error classifying log: {e}")
            log_type = "unknown"
            log_subtype = "unknown"
            confidence_score = 0.0
            entities = {}
            tags = []

        # Determine if this log requires an alert
        needs_alert = log_dict.get("level", "INFO") in ["ERROR", "CRITICAL", "FATAL"]

        if needs_alert:
            try:
                # Get remediation suggestion from Gemini
                remediation = await call_gemini_api(LogEntryCreate(**log_dict))

                # Create alert document - let MongoDB generate the _id
                new_alert = Alert(
                    timestamp=datetime.now(),
                    service_name=log_dict["service_name"],
                    environment=log_dict["environment"],
                    level=log_dict["level"],
                    message=log_dict["message"],
                    correlation_id=log_dict.get("correlation_id"),
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
                        logger.info(f"Alert created for {log_dict['service_name']} in {log_dict['environment']} with ID: {result.inserted_id}")
                        # Send email alert
                        try:
                            subject = f"🚨 Alert: {log_dict['level']} in {log_dict['service_name']} ({log_dict['environment']})"
                            context = {
                                "service_name": log_dict["service_name"],
                                "environment": log_dict["environment"],
                                "level": log_dict["level"],
                                "message": log_dict["message"],
                                "remediation": remediation,
                                "timestamp": str(datetime.now())
                            }
                            await send_email_alert(
                                subject=subject,
                                template_name="alert_email.html",
                                context=context
                            )
                            logger.info("✅ Email alert sent successfully")
                        except Exception as e:
                            logger.error(f"Failed to send email alert: {e}")
                        return True
                    return False

                try:
                    await perform_db_operation(insert_alert)
                except PyMongoError as e:
                    logger.error(f"Failed to create alert: {e}")
            except Exception as e:
                logger.error(f"Failed to process alert: {e}")

        # Update metrics
        try:
            await update_metrics(
                service_name=log_dict["service_name"],
                environment=log_dict["environment"],
                level=log_dict["level"],
                log_type=log_type,
                log_subtype=log_subtype
            )
        except Exception as e:
            logger.error(f"Failed to update metrics: {e}")

        logger.info("✅ Log processing complete")
    except Exception as e:
        logger.error(f"Error in process_log: {e}")
        # Don't raise the error - we want to continue processing other logs

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
