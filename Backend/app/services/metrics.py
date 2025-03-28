from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import MetricModel
from ..schemas import LogEntryCreate

async def update_metric(session: AsyncSession, log: LogEntryCreate) -> None:
    """
    Update aggregated metrics for the given service and environment.
    """
    result = await session.execute(
        select(MetricModel).where(
            MetricModel.service_name == log.service_name,
            MetricModel.environment == log.environment,
        )
    )
    metric = result.scalars().first()
    if metric:
        metric.total += 1
        if log.level.upper() == "ERROR":
            metric.errors += 1
    else:
        metric = MetricModel(
            service_name=log.service_name,
            environment=log.environment,
            total=1,
            errors=1 if log.level.upper() == "ERROR" else 0
        )
        session.add(metric)
    await session.commit()
