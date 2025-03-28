import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from pymongo import IndexModel, ASCENDING
from .config import settings

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

    # Collections
    log_entries = None
    alerts = None
    metrics = None

async def connect_to_mongo():
    """Establish connection to MongoDB"""
    logger.info("Connecting to MongoDB...")
    MongoDB.client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000
    )

    # Verify connection
    try:
        # The ismaster command is cheap and does not require auth
        await MongoDB.client.admin.command('ismaster')
        logger.info("✅ Successfully connected to MongoDB")
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise

    # Set up database and collections
    MongoDB.db = MongoDB.client[settings.MONGODB_DB_NAME]
    MongoDB.log_entries = MongoDB.db.log_entries
    MongoDB.alerts = MongoDB.db.alerts
    MongoDB.metrics = MongoDB.db.metrics

    # Create indexes
    await create_indexes()

async def create_indexes():
    """Create indexes for MongoDB collections"""
    # Indexes for log_entries collection
    log_indexes = [
        IndexModel([("timestamp", ASCENDING)]),
        IndexModel([("service_name", ASCENDING)]),
        IndexModel([("environment", ASCENDING)]),
        IndexModel([("level", ASCENDING)])
    ]
    await MongoDB.log_entries.create_indexes(log_indexes)

    # Indexes for alerts collection
    alert_indexes = [
        IndexModel([("service_name", ASCENDING)]),
        IndexModel([("environment", ASCENDING)]),
        IndexModel([("acknowledged", ASCENDING)])
    ]
    await MongoDB.alerts.create_indexes(alert_indexes)

    # Indexes for metrics collection
    metric_indexes = [
        IndexModel([("service_name", ASCENDING)]),
        IndexModel([("environment", ASCENDING)])
    ]
    await MongoDB.metrics.create_indexes(metric_indexes)
    logger.info("✅ Created MongoDB indexes")

async def close_mongo_connection():
    """Close MongoDB connection"""
    if MongoDB.client:
        MongoDB.client.close()
        logger.info("✅ MongoDB connection closed")

# Utility function for retry logic with MongoDB operations
async def perform_db_operation(operation, max_retries=3, retry_delay=0.5):
    """Execute a MongoDB operation with retry logic"""
    retry_count = 0

    while retry_count <= max_retries:
        try:
            return await operation()
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            if retry_count < max_retries:
                retry_count += 1
                wait_time = retry_delay * (2 ** retry_count)
                logger.warning(f"MongoDB operation failed, retrying in {wait_time:.2f}s (attempt {retry_count}/{max_retries})")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"MongoDB operation failed after {max_retries} attempts: {e}")
                raise
