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
    api_monitors = None

async def connect_to_mongo():
    """Establish connection to MongoDB"""
    logger.info("Connecting to MongoDB...")

    # Parse the connection string to determine if it's a MongoDB Atlas connection
    is_atlas = "mongodb+srv" in settings.MONGODB_URI or ".mongodb.net" in settings.MONGODB_URI

    # Configure connection options with longer timeout for Atlas
    connection_options = {
        "serverSelectionTimeoutMS": 10000,  # Increased from 5000 to 10000 ms
        "connectTimeoutMS": 20000,
        "socketTimeoutMS": 30000,
        "maxIdleTimeMS": 45000,
        "retryWrites": True,
        "retryReads": True,
    }

    # Add TLS/SSL settings for Atlas
    if is_atlas:
        logger.info("Detected MongoDB Atlas connection - adding SSL settings")
        connection_options.update({
            "ssl": True,
            "tlsAllowInvalidCertificates": False,
        })

    try:
        # Initialize the client with improved settings
        MongoDB.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            **connection_options
        )

        # Verify connection
        logger.info("Testing database connection...")
        await MongoDB.client.admin.command('ismaster')
        logger.info("✅ Successfully connected to MongoDB")

        # Set up database and collections
        MongoDB.db = MongoDB.client[settings.MONGODB_DB_NAME]
        MongoDB.log_entries = MongoDB.db.log_entries
        MongoDB.alerts = MongoDB.db.alerts
        MongoDB.metrics = MongoDB.db.metrics
        MongoDB.api_monitors = MongoDB.db.api_monitors

        # Create indexes
        await create_indexes()

    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        error_message = str(e)

        # Provide more helpful error messages
        if is_atlas:
            if "No replica set members found" in error_message:
                logger.error("❌ Could not connect to MongoDB Atlas: No replica set members found. "
                             "Check your credentials, network connectivity, and whitelist IP address.")
            elif "SSL" in error_message or "TLS" in error_message:
                logger.error("❌ MongoDB Atlas SSL/TLS connection issue. TLS/SSL is required for Atlas.")
            elif "password" in error_message or "authenticate" in error_message:
                logger.error("❌ Authentication failed for MongoDB Atlas. Check username/password.")
            else:
                logger.error(f"❌ Failed to connect to MongoDB: {e}")
        else:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")

        # Add fallback mode for development/testing
        if settings.ENABLE_FALLBACK_MODE:
            logger.warning("⚠️ Using in-memory fallback mode for development. Data will not persist!")
            # Initialize in-memory structures if needed
        else:
            raise

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

    # Indexes for api_monitors collection
    api_monitor_indexes = [
        IndexModel([("service_name", ASCENDING)]),
        IndexModel([("environment", ASCENDING)]),
        IndexModel([("acknowledged", ASCENDING)])
    ]
    await MongoDB.api_monitors.create_indexes(api_monitor_indexes)

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
