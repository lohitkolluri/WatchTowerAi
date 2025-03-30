import sys
from typing import Dict, Any
import sentry_sdk
from loguru import logger
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.pymongo import PyMongoIntegration

def setup_logging(config: Dict[str, Any]) -> None:
    """Configure logging for the application."""
    # Remove default logger
    logger.remove()

    # Add production logging format
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level> | "
        "correlation_id={extra[correlation_id]} | "
        "user_id={extra[user_id]}"
    )

    # Configure loguru logger
    logger.add(
        sys.stdout,
        format=log_format,
        level=config["LOG_LEVEL"],
        serialize=True,
        backtrace=True,
        diagnose=True,
        enqueue=True,
    )

    # Add file logging for errors in production
    if config["ENVIRONMENT"] == "production":
        logger.add(
            "logs/error.log",
            format=log_format,
            level="ERROR",
            rotation="100 MB",
            retention="30 days",
            compression="zip",
            serialize=True,
        )

    # Initialize Sentry if DSN is provided
    if sentry_dsn := config.get("SENTRY_DSN"):
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=config["ENVIRONMENT"],
            traces_sample_rate=1.0,
            integrations=[
                FastApiIntegration(),
                PyMongoIntegration(),
            ],
            before_send=before_send_event,
        )

def before_send_event(event: Dict[str, Any], hint: Dict[str, Any]) -> Dict[str, Any]:
    """Process the event before sending to Sentry."""
    # Remove sensitive information
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        if "Authorization" in headers:
            headers["Authorization"] = "[Filtered]"
        if "Cookie" in headers:
            headers["Cookie"] = "[Filtered]"

    return event
