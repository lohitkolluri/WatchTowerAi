from aiosmtplib import send as async_send_email, SMTPException
from email.message import EmailMessage
from ..config import settings
import logging

logger = logging.getLogger(__name__)

async def send_email_alert(subject: str, body: str) -> None:
    """
    Send an email alert asynchronously using aiosmtplib.
    """
    try:
        msg = EmailMessage()
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = settings.ALERT_RECIPIENT
        msg["Subject"] = subject
        msg.set_content(body, subtype="html")

        await async_send_email(
            msg,
            hostname=settings.SMTP_SERVER,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("📧 Email alert sent to %s", settings.ALERT_RECIPIENT)
    except SMTPException as e:
        logger.exception("❌ Failed to send email alert: %s", e)
