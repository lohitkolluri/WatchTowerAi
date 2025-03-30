from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from loguru import logger

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect_db(cls, settings: dict) -> None:
        """Connect to MongoDB with optimized connection pooling."""
        try:
            # Configure connection pool settings
            cls.client = AsyncIOMotorClient(
                settings["MONGODB_URI"],
                maxPoolSize=50,  # Maximum number of connections in the pool
                minPoolSize=10,  # Minimum number of connections in the pool
                maxIdleTimeMS=50000,  # Maximum time a connection can be idle (50 seconds)
                waitQueueTimeoutMS=5000,  # How long a thread will wait for a connection
                serverSelectionTimeoutMS=5000,  # How long to wait for server selection
                connectTimeoutMS=5000,  # How long to wait for a connection to be established
                retryWrites=True,  # Enable retryable writes
                w="majority",  # Write concern for better consistency
                journal=True,  # Ensure writes are journaled
                server_api=ServerApi('1'),  # Use latest MongoDB server API
            )

            # Get database instance
            cls.db = cls.client[settings["MONGODB_DB_NAME"]]

            # Verify connection
            await cls.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")

            # Create indexes
            await cls.create_indexes()

        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    @classmethod
    async def close_db(cls) -> None:
        """Close database connection."""
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("MongoDB connection closed")

    @classmethod
    async def get_db(cls) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if not cls.db:
            raise RuntimeError("Database not initialized")
        return cls.db

    @classmethod
    async def create_indexes(cls) -> None:
        """Create optimized indexes for collections."""
        try:
            # Users collection indexes
            await cls.db.users.create_indexes([
                {
                    "keys": [("email", 1)],
                    "unique": True,
                    "background": True,
                    "name": "unique_email"
                },
                {
                    "keys": [("username", 1)],
                    "unique": True,
                    "background": True,
                    "name": "unique_username"
                },
                {
                    "keys": [("created_at", -1)],
                    "background": True,
                    "name": "created_at_desc"
                }
            ])

            # Projects collection indexes
            await cls.db.projects.create_indexes([
                {
                    "keys": [("user_id", 1), ("name", 1)],
                    "unique": True,
                    "background": True,
                    "name": "unique_user_project"
                },
                {
                    "keys": [("user_id", 1), ("created_at", -1)],
                    "background": True,
                    "name": "user_projects_by_date"
                },
                {
                    "keys": [("status", 1)],
                    "background": True,
                    "name": "project_status"
                }
            ])

            # Alerts collection indexes
            await cls.db.alerts.create_indexes([
                {
                    "keys": [("project_id", 1), ("created_at", -1)],
                    "background": True,
                    "name": "project_alerts_by_date"
                },
                {
                    "keys": [("severity", 1)],
                    "background": True,
                    "name": "alert_severity"
                },
                {
                    "keys": [("status", 1)],
                    "background": True,
                    "name": "alert_status"
                },
                {
                    "keys": [
                        ("project_id", 1),
                        ("severity", 1),
                        ("created_at", -1)
                    ],
                    "background": True,
                    "name": "project_alerts_compound"
                }
            ])

            # Metrics collection indexes with TTL
            await cls.db.metrics.create_indexes([
                {
                    "keys": [("timestamp", 1)],
                    "expireAfterSeconds": 7 * 24 * 60 * 60,  # 7 days TTL
                    "background": True,
                    "name": "metrics_ttl"
                },
                {
                    "keys": [("project_id", 1), ("metric_type", 1), ("timestamp", -1)],
                    "background": True,
                    "name": "project_metrics_compound"
                }
            ])

            logger.info("Successfully created database indexes")

        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
            raise

    @classmethod
    def get_collection_stats(cls, collection_name: str) -> dict:
        """Get collection statistics for monitoring."""
        return cls.db.command("collStats", collection_name)
