import google.generativeai as genai
from ..config import settings
from ..schemas import LogEntryCreate
import logging
import time
import socket
import asyncio
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from enum import Enum

# Replace standard logging with Loguru
from loguru import logger

# Remove standard logger
# logger = logging.getLogger(__name__)

# Configure the Google Generative AI (Gemini) package with your API key.
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {e}")

# Setup the generation configuration with optimized parameters for production
generation_config = {
    "temperature": 0.3,  # Lower for more consistent, deterministic responses
    "top_p": 0.7,       # More focused output
    "top_k": 30,        # Reduced for consistency
    "max_output_tokens": 512,  # Optimized for concise remediation
}

# Create the generative model.
model = None
API_KEY = settings.GEMINI_API_KEY
MODEL_NAME = "gemini-2.5-flash-lite"

try:
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config=generation_config,
    )
except Exception as e:
    logger.warning(f"Failed to initialize Gemini model: {e}")

# Enhanced remediation suggestions with categorized responses
FALLBACK_REMEDIATIONS = {
    "database": {
        "connection": "Verify database connectivity: Check host/port, credentials, firewall rules. Restart database service if needed.",
        "query": "Review SQL/query syntax. Check indexes and execution plans. Optimize slow queries with EXPLAIN.",
        "transaction": "Check for deadlocks and transaction isolation levels. Review transaction logs and consider isolation level changes.",
        "timeout": "Increase timeout settings. Optimize queries and check for database load. Consider connection pooling.",
        "general": "Check database connectivity, credentials, and query syntax. Ensure database server is running with sufficient resources."
    },
    "auth": {
        "login": "Verify credentials and authentication service availability. Check for account lockouts or expired credentials.",
        "token": "Check token expiration. Regenerate if expired. Verify token signing and validation configuration.",
        "permission": "Review user roles and permissions. Verify RBAC configuration. Check for permission delegation issues.",
        "general": "Review authentication credentials and permissions. Check if tokens are expired or revoked."
    },
    "performance": {
        "latency": "Analyze response times. Check for N+1 queries, inefficient algorithms, or resource contention.",
        "memory": "Monitor memory usage. Look for memory leaks, inefficient data structures, or garbage collection issues.",
        "cpu": "Profile CPU usage. Identify hot spots. Optimize algorithms or consider horizontal scaling.",
        "throughput": "Check system load. Optimize serialization, caching, and database queries. Consider load balancing.",
        "general": "Increase available memory, look for memory leaks, or optimize memory usage in the application."
    },
    "request": {
        "client_error": "Review request format and parameters. Check API documentation. Verify required fields are present.",
        "server_error": "Check server logs for stack traces. Review recent deployments. Check resource availability.",
        "timeout": "Increase timeout settings, optimize slow operations, or check for resource constraints.",
        "general": "Check application logs for detailed stack traces. Review recent changes."
    },
    "security": {
        "injection": "Implement input validation and parameterized queries. Use ORM with prepared statements.",
        "access": "Review authentication and authorization logic. Check for privilege escalation vulnerabilities.",
        "attack": "Implement rate limiting, WAF rules, and DDoS protection. Review security logs.",
        "general": "Implement security best practices: input validation, HTTPS, secure headers, and regular security audits."
    },
    "infrastructure": {
        "server": "Check server health, logs, and resource availability. Restart service if needed.",
        "network": "Verify network connectivity and routing. Check firewall rules and DNS resolution.",
        "deployment": "Verify deployment status, rollback if necessary. Check for configuration issues.",
        "general": "Check system resources, service availability, and infrastructure dependencies."
    }
}

# Few-shot examples for better AI classification
FEW_SHOT_EXAMPLES = """
Example 1:
Log: "Connection refused on db-prod-01.example.com:5432"
Analysis: Type=database, Subtype=connection, Severity=high
Remediation: Verify PostgreSQL is running on db-prod-01.example.com:5432. Check firewall rules. Verify credentials.

Example 2:
Log: "Invalid JWT token: signature verification failed"
Analysis: Type=auth, Subtype=token_issue, Severity=high
Remediation: Check token expiration and signing keys. Regenerate token if needed. Verify issuer configuration.

Example 3:
Log: "Response time exceeded threshold: 5000ms (threshold: 1000ms)"
Analysis: Type=performance, Subtype=high_latency, Severity=medium
Remediation: Profile slow endpoints. Check database query performance. Consider caching or optimization.
"""

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
            url = f"https://generativelanguage.googleapis.com/v1/models/{MODEL_NAME}:generateContent?key={API_KEY}"

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
    
    Uses advanced prompt engineering with:
    - Structured output format
    - Few-shot examples
    - Chain-of-thought reasoning
    - Context-aware templates

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

        # Create enhanced prompt using structured prompt engineering
        # 1. System context and role
        prompt = (
            "You are an expert DevOps engineer and system administrator with deep expertise in troubleshooting production issues.\n"
            "Your goal is to provide concise, actionable remediation steps that a senior engineer can execute immediately.\n\n"
            
            # 2. Few-shot examples for better understanding
            "REFERENCE EXAMPLES:\n"
            f"{FEW_SHOT_EXAMPLES}\n\n"
            
            # 3. Task definition with output format
            "TASK: Analyze the log entry and provide immediate remediation steps.\n"
            "OUTPUT: Provide 2-3 specific, actionable steps. Keep response under 100 words.\n\n"
            
            # 4. Log context
            "LOG ENTRY:\n"
            f"- Service: {log.service_name}\n"
            f"- Environment: {log.environment}\n"
            f"- Level: {log.level}\n"
            f"- Message: {log.message}\n"
            f"- Classification: {log_type} / {log_subtype}\n"
        )

        # Add entities if available
        if entities and isinstance(entities, dict) and len(entities) > 0:
            prompt += "- Key Entities:\n"
            for entity_type, values in entities.items():
                if isinstance(values, list) and values:
                    prompt += f"  • {entity_type}: {', '.join(str(v) for v in values[:3])}\n"
                elif values:
                    prompt += f"  • {entity_type}: {values}\n"

        # Add decision tree guidance
        prompt += (
            "\n\nDECISION TREE:\n"
            "1. Is this a connectivity issue? → Check network/service availability\n"
            "2. Is this a performance issue? → Profile and optimize\n"
            "3. Is this a security issue? → Review and implement controls\n"
            "4. Is this a code issue? → Debug and fix\n\n"
            "REMEDIATION:"
        )

        # Try using the model first
        if model:
            try:
                # Properly await the response using asyncio
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))

                # Check for valid response
                if hasattr(response, "text") and response.text.strip():
                    remediation = response.text.strip()
                    logger.debug(f"AI remediation generated: {remediation[:100]}...")
                    return remediation
                else:
                    logger.warning("Empty response from model.generate_content")
            except Exception as e:
                logger.debug(f"Model approach failed, using direct API: {e}")

        # Fall back to direct API call if model approach fails
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://generativelanguage.googleapis.com/v1/models/{MODEL_NAME}:generateContent?key={API_KEY}"

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
                    remediation = text.strip()
                    logger.debug(f"AI remediation generated via API: {remediation[:100]}...")
                    return remediation

        # If we get here, both approaches failed
        logger.warning("Both model and direct API call failed. Using fallback remediation.")
        return get_fallback_remediation(log)

    except Exception as exc:
        logger.error(f"Google Gemini API call failed: {exc}")
        return get_fallback_remediation(log)

def get_fallback_remediation(log: LogEntryCreate) -> str:
    """
    Generate a remediation suggestion based on log content when API is unavailable.
    Uses intelligent pattern matching and categorized suggestions.

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
        type_remediations = FALLBACK_REMEDIATIONS.get(log_type, {})
        
        # Try to use subtype-specific remediation
        if isinstance(type_remediations, dict) and log_subtype:
            subtype_key = log_subtype.lower().replace(" ", "_")
            if subtype_key in type_remediations:
                return type_remediations[subtype_key]
        
        # Fall back to general remediation for this type
        if isinstance(type_remediations, dict) and "general" in type_remediations:
            return type_remediations["general"]
        elif isinstance(type_remediations, str):
            return type_remediations

    # Look for common patterns in the message
    if any(db_term in message for db_term in ["database", "db", "sql", "query", "mongo", "postgres", "mysql"]):
        if "timeout" in message or "connection" in message:
            return FALLBACK_REMEDIATIONS["database"]["timeout"]
        if "syntax" in message:
            return "Review SQL/query syntax. Check indexes. Use EXPLAIN to analyze execution plans."
        return FALLBACK_REMEDIATIONS["database"]["general"]

    if any(term in message for term in ["timeout", "timed out", "deadline exceeded"]):
        return FALLBACK_REMEDIATIONS["performance"]["timeout"]

    if any(term in message for term in ["memory", "out of memory", "oom"]):
        return FALLBACK_REMEDIATIONS["performance"]["memory"]

    if any(term in message for term in ["auth", "login", "password", "credential", "token", "jwt", "unauthorized"]):
        if "token" in message:
            return FALLBACK_REMEDIATIONS["auth"]["token"]
        return FALLBACK_REMEDIATIONS["auth"]["login"]

    if any(term in message for term in ["cpu", "high load", "load average"]):
        return FALLBACK_REMEDIATIONS["performance"]["cpu"]

    if any(term in message for term in ["injection", "xss", "csrf", "security", "attack"]):
        return FALLBACK_REMEDIATIONS["security"]["general"]

    # Default fallback based on log level
    if level in ["CRITICAL", "FATAL"]:
        return "CRITICAL ISSUE - Requires immediate investigation. Check: 1) System resource availability 2) Recent deployments 3) Service dependencies. Consider escalation if persists."

    if level == "ERROR":
        return "ERROR detected - Investigate: 1) Root cause via system logs 2) Recent code changes 3) Service dependencies. Consider rollback if error persists."

    # Generic fallback for INFO/DEBUG/WARN
    return "Monitor situation - Check: 1) Detailed logs for context 2) Service metrics 3) Resource availability. Escalate if issue persists."
