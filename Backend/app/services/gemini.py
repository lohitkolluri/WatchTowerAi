import google.generativeai as genai
from ..config import settings
from ..schemas import LogEntryCreate
import logging
import time
import socket
import asyncio
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Replace standard logging with Loguru
from loguru import logger

# Remove standard logger
# logger = logging.getLogger(__name__)

# Configure the Google Generative AI (Gemini) package with your API key.
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {e}")

# Setup the generation configuration.
generation_config = {
    "temperature": 0.5,  # Reduced temperature for more consistent responses
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 1024,  # Reduced for remediation suggestions
}

# Create the generative model.
model = None
API_KEY = settings.GEMINI_API_KEY
MODEL_NAME = "gemini-2.0-flash"  # Updated to use the same model as the working curl command

try:
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config=generation_config,
    )
except Exception as e:
    logger.warning(f"Failed to initialize Gemini model: {e}")

# Pre-defined remediation suggestions for common log issues
FALLBACK_REMEDIATIONS = {
    "database": "Check database connectivity, credentials, and query syntax. Ensure database server is running with sufficient resources.",
    "connection": "Verify network connectivity, check for firewall rules blocking the connection, and confirm service endpoints are operational.",
    "authentication": "Review authentication credentials and permissions. Check if tokens are expired or revoked.",
    "timeout": "Increase timeout settings, optimize the operation that's timing out, or check for resource constraints.",
    "memory": "Increase available memory, look for memory leaks, or optimize memory usage in the application.",
    "error": "Check application logs for detailed stack traces. Review recent changes that might have introduced this error."
}

async def check_gemini_api_availability():
    """
    Check if the Gemini API is available and responding by making a direct API call.
    Returns:
        tuple: (bool, str) - (is_available, status_message)
    """
    # Skip check if no API key
    if not API_KEY:
        return False, "No Gemini API key provided. AI remediation will use fallback suggestions."

    # Use direct HTTP call to ensure we're testing the API correctly
    try:
        # Use httpx for async HTTP requests
        async with httpx.AsyncClient(timeout=5.0) as client:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"

            # Simple payload similar to the working curl command
            payload = {
                "contents": [{
                    "parts": [{"text": "System check: Are you operational?"}]
                }]
            }

            # Make the request
            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            # Check if response is successful
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "candidates" in data and len(data["candidates"]) > 0:
                        logger.info("✅ Gemini API direct HTTP test succeeded")
                        return True, "Gemini API is operational. AI remediation is available."
                except Exception as e:
                    logger.error(f"Error parsing Gemini API response: {e}")

            logger.warning(f"❌ Gemini API returned status code {response.status_code}")
            return False, f"Gemini API returned status code {response.status_code}. AI remediation will use fallback suggestions."

    except Exception as e:
        logger.error(f"Error checking Gemini API: {e}")
        return False, f"Error connecting to Gemini API: {str(e)}. AI remediation will use fallback suggestions."

@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=5),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    reraise=True
)
async def call_gemini_api(log: LogEntryCreate) -> str:
    """
    Use the google-generativeai package to generate a remediation suggestion.
    Falls back to pattern-based suggestions if API is unavailable.

    Args:
        log: The log entry to analyze

    Returns:
        str: AI-generated remediation suggestion or fallback suggestion
    """
    # First check if Gemini API is likely available
    if not API_KEY:
        return get_fallback_remediation(log)

    try:
        # Extract log classification info if available
        log_type = getattr(log, "log_type", None) or "unknown"
        log_subtype = getattr(log, "log_subtype", None) or "unknown"
        entities = getattr(log, "entities", {}) or {}

        # Create enhanced prompt using log classification data
        prompt = (
            f"You are a senior system administrator analyzing a log entry. "
            f"Provide concise, focused remediation suggestion, no more than 100 words. The priority is mentioning key issues and their remedies without too much of explanation.\n\n"
            f"Log details:\n"
            f"- Service: {log.service_name}\n"
            f"- Environment: {log.environment}\n"
            f"- Level: {log.level}\n"
            f"- Message: {log.message}\n"
            f"- Log Type: {log_type}\n"
            f"- Log Subtype: {log_subtype}\n"
        )

        # Add entities if available
        if entities and isinstance(entities, dict) and len(entities) > 0:
            prompt += "- Entities:\n"
            for entity_type, values in entities.items():
                if isinstance(values, list):
                    prompt += f"  - {entity_type}: {', '.join(values)}\n"
                else:
                    prompt += f"  - {entity_type}: {values}\n"

        # Use model if available (legacy approach)
        if model:
            try:
                # Properly await the response using asyncio
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))

                # Check for valid response
                if hasattr(response, "text") and response.text.strip():
                    return response.text.strip()
                else:
                    logger.warning("Empty response from model.generate_content")
            except Exception as e:
                logger.error(f"Error using model.generate_content: {e}")

        # Fall back to direct API call if model approach fails
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"

            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }

            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                if "candidates" in data and len(data["candidates"]) > 0:
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text.strip()

        # If we get here, both approaches failed
        logger.warning("Both model and direct API call failed. Using fallback remediation.")
        return get_fallback_remediation(log)

    except Exception as exc:
        logger.error(f"Google Gemini API call failed: {exc}")
        return get_fallback_remediation(log)

def get_fallback_remediation(log: LogEntryCreate) -> str:
    """
    Generate a remediation suggestion based on log content when API is unavailable.

    Args:
        log: The log entry to analyze

    Returns:
        str: A relevant remediation suggestion based on log content
    """
    message = log.message.lower()
    level = log.level.upper()
    service = log.service_name.lower()

    # Use log classification if available
    log_type = getattr(log, "log_type", None)
    log_subtype = getattr(log, "log_subtype", None)

    # If we have classification data, use it for more targeted fallback
    if log_type and log_type != "unknown":
        if log_type in FALLBACK_REMEDIATIONS:
            base_remediation = FALLBACK_REMEDIATIONS[log_type]

            # Add subtype-specific advice if available
            if log_subtype and log_subtype != "unknown" and log_subtype != "general":
                if log_subtype in FALLBACK_REMEDIATIONS:
                    return f"{base_remediation} {FALLBACK_REMEDIATIONS[log_subtype]}"
                elif "connection" in log_subtype:
                    return f"{base_remediation} {FALLBACK_REMEDIATIONS['connection']}"
                elif "timeout" in log_subtype:
                    return f"{base_remediation} {FALLBACK_REMEDIATIONS['timeout']}"

            return base_remediation

    # Look for common patterns in the message
    if "database" in message or "db" in message or "sql" in message or "query" in message:
        if "timeout" in message or "connection" in message:
            return FALLBACK_REMEDIATIONS["database"] + " Check for database connection timeouts or high load."
        if "syntax" in message:
            return "Review SQL query syntax. Check for malformed queries or incorrect table references."
        return FALLBACK_REMEDIATIONS["database"]

    if "timeout" in message or "timed out" in message:
        return FALLBACK_REMEDIATIONS["timeout"]

    if "memory" in message or "out of memory" in message:
        return FALLBACK_REMEDIATIONS["memory"]

    if "auth" in message or "login" in message or "password" in message or "credential" in message:
        return FALLBACK_REMEDIATIONS["authentication"]

    # Default fallback based on log level
    if level in ["CRITICAL", "FATAL"]:
        return "This is a critical issue that requires immediate attention. Check system resource availability, recent deployments, and service dependencies."

    if level == "ERROR":
        return "Investigate the root cause by checking system logs, recent code changes, and dependencies. Consider rolling back recent changes if the error persists."

    # Generic fallback
    return "Check system logs for more details. Verify service connectivity, available resources, and recent code deployments."
