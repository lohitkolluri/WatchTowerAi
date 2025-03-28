from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas import LogEntryCreate
from ..models import AlertModel
from .gemini import call_gemini_api
from .email_alert import send_email_alert
from .metrics import update_metric

async def process_log(log: LogEntryCreate, db: AsyncSession) -> None:
    """
    Process a log entry:
      - If the log level is ERROR, call Gemini API for remediation.
      - If remediation is provided, create an alert and send an email.
      - Update aggregated metrics.
    """
    remediation = ""
    if log.level.upper() == "ERROR":
        remediation = await call_gemini_api(log)

    if remediation:
        alert = AlertModel(
            service_name=log.service_name,
            environment=log.environment,
            severity="Critical",
            description=f"Error in {log.service_name}: {log.message}",
            remediation=remediation
        )
        db.add(alert)
        await db.commit()
        subject = f"[Alert] {log.service_name} Error Detected"
        body = f"""
            <h3>Alert for {log.service_name}</h3>
            <p><strong>Description:</strong> {alert.description}</p>
            <p><strong>Remediation:</strong> {alert.remediation}</p>
            <p><strong>Time:</strong> {alert.timestamp}</p>
        """
        await send_email_alert(subject, body)
    await update_metric(db, log)
