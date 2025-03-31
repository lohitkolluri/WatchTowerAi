from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ASCENDING, DESCENDING
from loguru import logger

class QueryOptimizer:
    @staticmethod
    def optimize_find_query(
        query: Dict[str, Any],
        collection: AsyncIOMotorCollection,
        explain: bool = False
    ) -> Dict[str, Any]:
        """Optimize a find query by analyzing the query pattern."""
        # Add query hints based on available indexes
        optimized_query = query.copy()

        # Check for date range queries and optimize
        if "created_at" in query:
            if isinstance(query["created_at"], dict):
                # Ensure proper index usage for date ranges
                if "$gte" in query["created_at"] or "$gt" in query["created_at"]:
                    optimized_query["created_at"] = {
                        "$gte": query["created_at"].get("$gte", query["created_at"].get("$gt")),
                        "$lt": query["created_at"].get("$lt", query["created_at"].get("$lte", datetime.now()))
                    }

        # Optimize text search if present
        if "$text" in query:
            # Ensure text index exists
            optimized_query["$text"] = {
                "$search": query["$text"]["$search"],
                "$caseSensitive": False,
                "$diacriticSensitive": False
            }

        return optimized_query

    @staticmethod
    async def paginated_find(
        collection: AsyncIOMotorCollection,
        query: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None,
        sort: Optional[List[tuple]] = None,
        page_size: int = 20,
        page: int = 1,
        max_time_ms: int = 5000,
    ) -> Dict[str, Any]:
        """Execute an optimized paginated find query."""
        try:
            # Optimize the query
            optimized_query = QueryOptimizer.optimize_find_query(query, collection)

            # Calculate skip value
            skip = (page - 1) * page_size

            # Get total count (with timeout)
            total = await collection.count_documents(
                optimized_query,
                maxTimeMS=max_time_ms
            )

            # Execute find with optimizations
            cursor = collection.find(
                optimized_query,
                projection,
                sort=sort,
                skip=skip,
                limit=page_size,
                max_time_ms=max_time_ms,
                batch_size=page_size
            )

            # Get results
            results = await cursor.to_list(length=page_size)

            return {
                "data": results,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }

        except Exception as e:
            logger.error(f"Error in paginated find: {e}")
            raise

    @staticmethod
    async def bulk_write_with_retry(
        collection: AsyncIOMotorCollection,
        operations: List[Dict[str, Any]],
        max_retries: int = 3,
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """Execute bulk write operations with retry logic and batching."""
        results = {
            "inserted": 0,
            "modified": 0,
            "deleted": 0,
            "errors": []
        }

        # Split operations into batches
        for i in range(0, len(operations), batch_size):
            batch = operations[i:i + batch_size]
            retries = 0

            while retries < max_retries:
                try:
                    result = await collection.bulk_write(
                        batch,
                        ordered=False  # Allow parallel processing
                    )

                    # Update statistics
                    results["inserted"] += result.inserted_count
                    results["modified"] += result.modified_count
                    results["deleted"] += result.deleted_count
                    break

                except Exception as e:
                    retries += 1
                    if retries == max_retries:
                        results["errors"].append(str(e))
                        logger.error(f"Bulk write failed after {max_retries} retries: {e}")
                    else:
                        logger.warning(f"Bulk write retry {retries}: {e}")
                        await asyncio.sleep(1 * retries)  # Exponential backoff

        return results

    @staticmethod
    async def aggregate_with_timeout(
        collection: AsyncIOMotorCollection,
        pipeline: List[Dict[str, Any]],
        max_time_ms: int = 10000,
        allow_disk_use: bool = True,
        batch_size: int = 100
    ) -> List[Dict[str, Any]]:
        """Execute an optimized aggregation pipeline with timeout."""
        try:
            # Add optimization stages
            optimized_pipeline = [
                # Add $hint if applicable
                *pipeline,
                # Add $limit to prevent excessive memory usage
                {"$limit": 10000}
            ]

            cursor = collection.aggregate(
                optimized_pipeline,
                maxTimeMS=max_time_ms,
                allowDiskUse=allow_disk_use,
                batchSize=batch_size
            )

            return await cursor.to_list(length=None)

        except Exception as e:
            logger.error(f"Aggregation error: {e}")
            raise

    @staticmethod
    def create_compound_index_hint(
        sort_fields: List[tuple],
        filter_fields: Dict[str, Any]
    ) -> List[tuple]:
        """Create an optimal compound index hint based on query pattern."""
        index_fields = []

        # Add equality filter fields first
        for field in filter_fields:
            if not isinstance(filter_fields[field], dict):
                index_fields.append((field, ASCENDING))

        # Add sort fields
        for field, direction in sort_fields:
            if field not in [f[0] for f in index_fields]:
                index_fields.append((field, direction))

        return index_fields
