from typing import Dict, List, Optional
import time
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from prometheus_client import Counter, Histogram, Gauge
from loguru import logger

# Prometheus metrics
QUERY_DURATION = Histogram(
    'mongodb_query_duration_seconds',
    'MongoDB query duration in seconds',
    ['collection', 'operation']
)

QUERY_ERRORS = Counter(
    'mongodb_query_errors_total',
    'Total number of MongoDB query errors',
    ['collection', 'operation']
)

CONNECTION_POOL_SIZE = Gauge(
    'mongodb_connection_pool_size',
    'MongoDB connection pool size',
    ['state']  # in_use, available
)

SLOW_QUERIES = Counter(
    'mongodb_slow_queries_total',
    'Total number of slow MongoDB queries',
    ['collection', 'operation']
)

class DatabaseMonitor:
    def __init__(self, db: AsyncIOMotorDatabase, slow_query_threshold_ms: int = 100):
        self.db = db
        self.slow_query_threshold_ms = slow_query_threshold_ms
        self._query_stats: Dict[str, List[float]] = {}

    async def get_database_stats(self) -> Dict:
        """Get overall database statistics."""
        try:
            return await self.db.command("dbStats")
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {}

    async def get_collection_stats(self, collection_name: str) -> Dict:
        """Get statistics for a specific collection."""
        try:
            return await self.db.command("collStats", collection_name)
        except Exception as e:
            logger.error(f"Failed to get collection stats for {collection_name}: {e}")
            return {}

    async def analyze_indexes(self, collection_name: str) -> List[Dict]:
        """Analyze index usage for a collection."""
        try:
            return await self.db[collection_name].index_information()
        except Exception as e:
            logger.error(f"Failed to analyze indexes for {collection_name}: {e}")
            return []

    async def get_slow_queries(self, threshold_ms: Optional[int] = None) -> List[Dict]:
        """Get slow queries from system.profile."""
        threshold = threshold_ms or self.slow_query_threshold_ms
        try:
            # Enable profiling if not already enabled
            await self.db.command({
                "profile": 1,
                "slowms": threshold
            })

            # Query the system.profile collection
            cursor = self.db.system.profile.find({
                "millis": {"$gt": threshold},
                "ts": {"$gt": datetime.utcnow() - timedelta(hours=24)}
            }).sort("millis", -1).limit(100)

            return await cursor.to_list(length=100)
        except Exception as e:
            logger.error(f"Failed to get slow queries: {e}")
            return []

    def record_query_duration(
        self,
        collection: str,
        operation: str,
        duration: float
    ) -> None:
        """Record query duration and update metrics."""
        QUERY_DURATION.labels(collection=collection, operation=operation).observe(duration)

        # Check for slow queries
        if duration * 1000 > self.slow_query_threshold_ms:
            SLOW_QUERIES.labels(collection=collection, operation=operation).inc()
            logger.warning(
                f"Slow query detected: {collection}.{operation} "
                f"took {duration:.2f} seconds"
            )

    def record_query_error(self, collection: str, operation: str) -> None:
        """Record query error and update metrics."""
        QUERY_ERRORS.labels(collection=collection, operation=operation).inc()

    async def get_connection_pool_stats(self) -> Dict:
        """Get connection pool statistics."""
        try:
            stats = await self.db.command("serverStatus")
            connections = stats.get("connections", {})

            # Update connection pool metrics
            CONNECTION_POOL_SIZE.labels(state="in_use").set(
                connections.get("current", 0)
            )
            CONNECTION_POOL_SIZE.labels(state="available").set(
                connections.get("available", 0)
            )

            return connections
        except Exception as e:
            logger.error(f"Failed to get connection pool stats: {e}")
            return {}

    async def analyze_query_patterns(self, collection_name: str) -> Dict:
        """Analyze query patterns for a collection."""
        try:
            # Get query execution stats
            pipeline = [
                {"$collStats": {"latencyStats": {"histograms": True}}},
                {"$project": {"latencyStats": 1}}
            ]

            cursor = self.db[collection_name].aggregate(pipeline)
            stats = await cursor.to_list(length=1)

            return {
                "collection": collection_name,
                "latency_stats": stats[0] if stats else {},
                "indexes": await self.analyze_indexes(collection_name)
            }
        except Exception as e:
            logger.error(f"Failed to analyze query patterns for {collection_name}: {e}")
            return {}

    async def monitor_database_health(self) -> Dict:
        """Monitor overall database health."""
        try:
            # Get server status
            server_status = await self.db.command("serverStatus")

            # Get database stats
            db_stats = await self.get_database_stats()

            # Get connection pool stats
            pool_stats = await self.get_connection_pool_stats()

            return {
                "server_status": {
                    "connections": server_status.get("connections", {}),
                    "opcounters": server_status.get("opcounters", {}),
                    "mem": server_status.get("mem", {})
                },
                "database_stats": db_stats,
                "connection_pool": pool_stats,
                "timestamp": datetime.utcnow()
            }
        except Exception as e:
            logger.error(f"Failed to monitor database health: {e}")
            return {}
