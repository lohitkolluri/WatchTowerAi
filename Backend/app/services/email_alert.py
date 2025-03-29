import os
import logging
from datetime import datetime
from pathlib import Path
from aiosmtplib import send as async_send_email, SMTPException
from email.message import EmailMessage
from jinja2 import Environment, FileSystemLoader, TemplateError
from tenacity import retry, stop_after_attempt, wait_exponential
from ..config import settings

logger = logging.getLogger(__name__)

# Set up Jinja2 environment
templates_dir = Path(__file__).parents[3] / "backend/email_templates"
os.makedirs(templates_dir, exist_ok=True)
env = Environment(loader=FileSystemLoader(templates_dir))

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
async def send_email_alert(subject: str, template_name: str, context: dict) -> None:
    """
    Send an email alert using a Jinja2 template.

    Args:
        subject: Email subject line
        template_name: Name of the template file (e.g. "alert_email.html")
        context: Dictionary containing variables to render in the template

    Raises:
        SMTPException: When email sending fails after retries
    """
    logger.info(f"📧 Preparing to send email with subject: {subject}")
    logger.info(f"Using template: {template_name}")
    logger.debug(f"Email context: {context}")

    # Verify SMTP settings are available
    if not all([
        settings.SMTP_SERVER,
        settings.SMTP_PORT,
        settings.SMTP_USERNAME,
        settings.SMTP_PASSWORD,
        settings.EMAIL_FROM,
        settings.ALERT_RECIPIENT
    ]):
        logger.error("❌ Missing SMTP configuration. Check your .env file.")
        logger.debug(f"SMTP Server: {settings.SMTP_SERVER}")
        logger.debug(f"SMTP Port: {settings.SMTP_PORT}")
        logger.debug(f"From: {settings.EMAIL_FROM}")
        logger.debug(f"To: {settings.ALERT_RECIPIENT}")
        return

    try:
        # Render template
        try:
            template = env.get_template(template_name)
            html_body = template.render(**context)
            logger.debug("✅ Template rendered successfully")
        except TemplateError as e:
            logger.error(f"❌ Template rendering failed: {str(e)}")
            # Fallback to plain text if template fails
            html_body = f"<html><body><h1>{subject}</h1><pre>{str(context)}</pre></body></html>"
            logger.info("Using fallback plain HTML template")

        # Create email message
        msg = EmailMessage()
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = settings.ALERT_RECIPIENT
        msg["Subject"] = subject
        msg.set_content(html_body, subtype="html")

        # Send email
        logger.info(f"🚀 Sending email to {settings.ALERT_RECIPIENT} via {settings.SMTP_SERVER}:{settings.SMTP_PORT}")

        try:
            await async_send_email(
                message=msg,
                hostname=settings.SMTP_SERVER,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USERNAME,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            logger.info("✅ Email alert sent successfully")
        except SMTPException as e:
            logger.error(f"❌ SMTP Error: {str(e)}")
            raise
        except ConnectionRefusedError:
            logger.error(f"❌ Connection refused to SMTP server. Check your SMTP settings.")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error sending email: {str(e)}")
            raise

    except Exception as e:
        logger.exception(f"❌ Email sending failed: {str(e)}")
        raise

async def send_alert_for_log(service_name: str, environment: str, level: str,
                            message: str, remediation: str = None) -> None:
    """
    Helper function to send an alert email for a specific log entry.

    Args:
        service_name: Name of the service generating the log
        environment: Environment (dev, staging, prod)
        level: Log level (ERROR, WARN, etc.)
        message: The log message
        remediation: Optional AI-generated remediation suggestion
    """
    subject = f"🚨 Alert: {level} in {service_name} ({environment})"

    context = {
        "service_name": service_name,
        "environment": environment,
        "level": level,
        "message": message,
        "remediation": remediation or "No remediation available",
        "timestamp": str(datetime.now()),
    }

    await send_email_alert(subject, "alert_email.html", context)
