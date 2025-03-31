from typing import Any, Dict, Optional, Type
import time
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorCollection
from loguru import logger
from .database import Database
from .query_optimizer import QueryOptimizer
from .db_monitor import DatabaseMonitor

class DatabaseContext:
    def __init__(self):
        self.db = None
        self.monitor = None
        self._initialized = False

    async def initialize(self, settings: Dict[str, Any]) -> None:
        """Initialize database connection and monitoring."""
        if not self._initialized:
            await Database.connect_db(settings)
            self.db = await Database.get_db()
            self.monitor = DatabaseMonitor(self.db)
            self._initialized = True

    async def close(self) -> None:
        """Close database connection."""
        if self._initialized:
            await Database.close_db()
            self._initialized = False

    @asynccontextmanager
    async def collection_context(
        self,
        collection_name: str,
        trace_queries: bool = True
    ):
        """Context manager for collection operations with monitoring."""
        collection = self.db[collection_name]
        start_time = time.time()

        try:
            yield CollectionWrapper(
                collection,
                self.monitor,
                trace_queries
            )
        finally:
            if trace_queries:
                duration = time.time() - start_time
                self.monitor.record_query_duration(
                    collection_name,
                    "context",
                    duration
                )

class CollectionWrapper:
    def __init__(
        self,
        collection: AsyncIOMotorCollection,
        monitor: DatabaseMonitor,
        trace_queries: bool = True
    ):
        self.collection = collection
        self.monitor = monitor
        self.trace_queries = trace_queries
        self.optimizer = QueryOptimizer()

    async def find_one(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Execute an optimized find_one query."""
        start_time = time.time()
        try:
            optimized_query = self.optimizer.optimize_find_query(
                query,
                self.collection
            )
            result = await self.collection.find_one(optimized_query, projection)
            return result
        except Exception as e:
            if self.trace_queries:
                self.monitor.record_query_error(
                    self.collection.name,
                    "find_one"
                )
            logger.error(f"Error in find_one: {e}")
            raise
        finally:
            if self.trace_queries:
                duration = time.time() - start_time
                self.monitor.record_query_duration(
                    self.collection.name,
                    "find_one",
                    duration
                )

    async def find_many(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None,
        sort: Optional[list] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Execute an optimized find query with pagination."""
        start_time = time.time()
        try:
            return await self.optimizer.paginated_find(
                self.collection,
                query,
                projection,
                sort,
                page_size,
                page
            )
        except Exception as e:
            if self.trace_queries:
                self.monitor.record_query_error(
                    self.collection.name,
                    "find_many"
                )
            logger.error(f"Error in find_many: {e}")
            raise
        finally:
            if self.trace_queries:
                duration = time.time() - start_time
                self.monitor.record_query_duration(
                    self.collection.name,
                    "find_many",
                    duration
                )

    async def aggregate(
        self,
        pipeline: list,
        max_time_ms: int = 10000
    ) -> list:
        """Execute an optimized aggregation pipeline."""
        start_time = time.time()
        try:
            return await self.optimizer.aggregate_with_timeout(
                self.collection,
                pipeline,
                max_time_ms
            )
        except Exception as e:
            if self.trace_queries:
                self.monitor.record_query_error(
                    self.collection.name,
                    "aggregate"
                )
            logger.error(f"Error in aggregate: {e}")
            raise
        finally:
            if self.trace_queries:
                duration = time.time() - start_time
                self.monitor.record_query_duration(
                    self.collection.name,
                    "aggregate",
                    duration
                )

    async def bulk_write(
        self,
        operations: list,
        ordered: bool = False
    ) -> Dict[str, Any]:
        """Execute optimized bulk write operations."""
        start_time = time.time()
        try:
            return await self.optimizer.bulk_write_with_retry(
                self.collection,
                operations,
                ordered=ordered
            )
        except Exception as e:
            if self.trace_queries:
                self.monitor.record_query_error(
                    self.collection.name,
                    "bulk_write"
                )
            logger.error(f"Error in bulk_write: {e}")
            raise
        finally:
            if self.trace_queries:
                duration = time.time() - start_time
                self.monitor.record_query_duration(
                    self.collection.name,
                    "bulk_write",
                    duration
                )

    async def update_one(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        upsert: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Execute an optimized update_one operation."""
        start_time = time.time()
        try:
            optimized_query = self.optimizer.optimize_find_query(
                query,
                self.collection
            )
            result = await self.collection.update_one(
                optimized_query,
                update,
                upsert=upsert
            )
            return {
                "matched_count": result.matched_count,
                "modified_count": result.modified_count,
                "upserted_id": result.upserted_id
            }
        except Exception as e:
            if self.trace_queries:
                self.monitor.record_query_error(
                    self.collection.name,
                    "update_one"
                )
            logger.error(f"Error in update_one: {e}")
            raise
        finally:
            if self.trace_queries:
                duration = time.time() - start_time
                self.monitor.record_query_duration(
                    self.collection.name,
                    "update_one",
                    duration
                )

    async def delete_many(
        self,
        query: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute an optimized delete_many operation."""
        start_time = time.time()
        try:
            optimized_query = self.optimizer.optimize_find_query(
                query,
                self.collection
            )
            result = await self.collection.delete_many(optimized_query)
            return {"deleted_count": result.deleted_count}
        except Exception as e:
            if self.trace_queries:
                self.monitor.record_query_error(
                    self.collection.name,
                    "delete_many"
                )
            logger.error(f"Error in delete_many: {e}")
            raise
        finally:
            if self.trace_queries:
                duration = time.time() - start_time
                self.monitor.record_query_duration(
                    self.collection.name,
                    "delete_many",
                    duration
                )
