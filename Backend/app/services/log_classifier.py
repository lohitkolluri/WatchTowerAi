import logging
import re
import json
import httpx
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
from ..config import settings

# Replace standard logging with Loguru
from loguru import logger

# Constants for Gemini API
API_KEY = settings.GEMINI_API_KEY
MODEL_NAME = "gemini-2.0-flash"  # Using the same model as in gemini.py

# Remove standard logger
# logger = logging.getLogger(__name__)

# Common log patterns for classification
LOG_PATTERNS = {
    # Database related patterns
    "database": [
        r"(?i)(database|db).*(?:error|exception|timeout|connection|query)",
        r"(?i)(mongodb|mysql|postgres|sql|nosql)",
        r"(?i)(query.*failed|connection.*refused|timeout)",
    ],

    # Authentication patterns
    "auth": [
        r"(?i)(auth.*fail|login.*fail|invalid.*credentials|password|unauthorized)",
        r"(?i)(token.*expired|invalid.*token|jwt|oauth)",
        r"(?i)(permission.*denied|access.*denied|forbidden)",
    ],

    # Request/Response patterns
    "request": [
        r"(?i)(request|response|http|api|endpoint)",
        r"(?i)(get|post|put|delete|patch|options)",
        r"(?i)(status.*code|200|404|500|403)",
    ],

    # Performance patterns
    "performance": [
        r"(?i)(slow|latency|timeout|performance)",
        r"(?i)(memory|cpu|load|usage|consumption)",
        r"(?i)(bottleneck|optimization|throughput)",
    ],

    # Security patterns
    "security": [
        r"(?i)(security|attack|vulnerability|exploit)",
        r"(?i)(injection|xss|csrf|sql.*injection)",
        r"(?i)(firewall|waf|intrusion)",
    ],

    # Infrastructure patterns
    "infrastructure": [
        r"(?i)(server|instance|container|pod|node)",
        r"(?i)(kubernetes|k8s|docker|aws|azure|gcp)",
        r"(?i)(deploy|provision|scale|infrastructure)",
    ],
}

# Subtypes for more detailed classification
LOG_SUBTYPES = {
    "database": [
        ("connection", r"(?i)(connection.*(?:error|refused|timeout|lost))"),
        ("query", r"(?i)(query.*(?:error|failed|invalid|timeout))"),
        ("transaction", r"(?i)(transaction.*(?:error|failed|rollback|deadlock))"),
    ],
    "auth": [
        ("login_failure", r"(?i)(login.*fail|invalid.*credentials)"),
        ("token_issue", r"(?i)(token.*(?:expired|invalid|missing))"),
        ("permission", r"(?i)(permission.*denied|insufficient.*privileges)"),
    ],
    "request": [
        ("client_error", r"(?i)(400|401|403|404|4\d\d)"),
        ("server_error", r"(?i)(500|502|503|504|5\d\d)"),
        ("timeout", r"(?i)(timeout|timed.*out)"),
    ],
    "performance": [
        ("high_latency", r"(?i)(high.*latency|slow.*response)"),
        ("memory_issue", r"(?i)(memory.*(?:leak|high|consumption))"),
        ("cpu_issue", r"(?i)(cpu.*(?:high|spike|usage))"),
    ],
    "security": [
        ("injection", r"(?i)(injection|xss|csrf)"),
        ("access", r"(?i)(unauthorized.*access|intrusion)"),
        ("malicious", r"(?i)(attack|malicious|hack)"),
    ],
    "infrastructure": [
        ("server", r"(?i)(server.*(?:down|crash|unreachable))"),
        ("scaling", r"(?i)(scale|scaling|provision)"),
        ("network", r"(?i)(network.*(?:error|issue|unreachable))"),
    ],
}

# Entity extraction patterns
ENTITY_PATTERNS = {
    "ip_address": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "url": r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+(?:/\S*)?",
    "timestamp": r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?",
    "user_id": r"user(?:_id)?[:=]\s*['\"]?([a-zA-Z0-9-_]+)['\"]?",
    "request_id": r"(?:request|trace|correlation)(?:_id)?[:=]\s*['\"]?([a-zA-Z0-9-_]+)['\"]?",
}

async def classify_log(log_data: Dict[str, Any]) -> Tuple[str, str, float, Dict[str, List[str]], List[str]]:
    """
    Classifies a log entry based on its content and returns the classification.
    Uses a hybrid approach: pattern-based first, then Gemini AI if confidence is low.

    Args:
        log_data: The log data to classify

    Returns:
        Tuple containing:
        - log_type: The primary log type
        - log_subtype: More specific category
        - confidence: Confidence score (0.0-1.0)
        - entities: Extracted entities from the log
        - tags: List of tags for the log
    """
    # Extract the text to classify from various fields
    text_to_classify = ""

    # Combine message and any error info
    if "message" in log_data and log_data["message"]:
        text_to_classify += str(log_data["message"]) + " "

    if "error_code" in log_data and log_data["error_code"]:
        text_to_classify += str(log_data["error_code"]) + " "

    # Include raw payload if available
    if "raw_payload" in log_data and log_data["raw_payload"]:
        try:
            if isinstance(log_data["raw_payload"], dict):
                # Extract values from the payload
                for key, value in log_data["raw_payload"].items():
                    if isinstance(value, (str, int, float, bool)):
                        text_to_classify += f"{value} "
        except Exception as e:
            logger.warning(f"Error processing raw payload: {e}")

    # If we still don't have text to classify, use the entire log data as string
    if not text_to_classify.strip():
        text_to_classify = str(log_data)

    # Pattern-based classification
    log_type, type_score = classify_by_pattern(text_to_classify, LOG_PATTERNS)

    # Get subtype if we have a primary type
    log_subtype = "unknown"
    subtype_score = 0.0

    if log_type in LOG_SUBTYPES:
        log_subtype, subtype_score = classify_subtype(text_to_classify, log_type, LOG_SUBTYPES[log_type])

    # Calculate overall confidence
    confidence = (type_score + subtype_score) / 2 if log_type != "unknown" else type_score

    # Extract entities
    entities = extract_entities(text_to_classify)

    # Check if confidence is below threshold or type is unknown, try Gemini AI classification
    CONFIDENCE_THRESHOLD = 0.7
    if confidence < CONFIDENCE_THRESHOLD or log_type == "unknown":
        logger.info(f"Pattern confidence low ({confidence:.2f}), trying Gemini AI classification")

        # Only attempt Gemini if we have an API key
        if API_KEY:
            try:
                # Call Gemini API for classification
                gemini_log_type, gemini_log_subtype, gemini_entities = await classify_with_gemini(text_to_classify)

                # If Gemini returned valid type, use it
                if gemini_log_type and gemini_log_type != "unknown":
                    logger.info(f"Using Gemini classification: {gemini_log_type}/{gemini_log_subtype}")
                    log_type = gemini_log_type
                    log_subtype = gemini_log_subtype
                    confidence = 0.9  # Set high confidence for Gemini results

                    # Merge entities from both approaches, with Gemini taking precedence
                    if gemini_entities and isinstance(gemini_entities, dict):
                        for entity_type, values in gemini_entities.items():
                            if entity_type not in entities:
                                entities[entity_type] = []

                            if isinstance(values, list):
                                for value in values:
                                    if value not in entities[entity_type]:
                                        entities[entity_type].append(value)
                            elif isinstance(values, str) and values not in entities[entity_type]:
                                entities[entity_type].append(values)
            except Exception as e:
                logger.error(f"Error using Gemini for classification: {e}")

    # Generate tags
    tags = generate_tags(log_data, log_type, log_subtype, entities)

    return log_type, log_subtype, confidence, entities, tags

async def classify_with_gemini(text: str) -> Tuple[str, str, Dict[str, List[str]]]:
    """
    Use Gemini AI to classify log entries when pattern-based approach has low confidence.

    Args:
        text: The log text to classify

    Returns:
        Tuple containing:
        - log_type: Primary log type
        - log_subtype: More specific subtype
        - entities: Extracted entities
    """
    # Create prompt for Gemini
    prompt = (
        "You are a log analysis expert. Classify the following log entry into one primary type: "
        "[database, auth, request, performance, security, infrastructure, application, unknown]. "
        "If possible, provide a relevant subtype (e.g., connection_error, login_failure, timeout, high_latency, "
        "injection, scaling, general). Extract key entities like IP addresses, user IDs, error codes, URLs, "
        "file paths, resource IDs. Respond in JSON format with keys: 'log_type', 'log_subtype', 'entities'. "
        f"Log Entry: ```{text}```"
    )

    async with httpx.AsyncClient(timeout=5.0) as client:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        try:
            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                if "candidates" in data and len(data["candidates"]) > 0:
                    text_response = data["candidates"][0]["content"]["parts"][0]["text"]

                    # Try to parse JSON response
                    try:
                        # Extract JSON from response (handling possible markdown code blocks)
                        json_str = text_response
                        if "```json" in json_str:
                            json_str = json_str.split("```json")[1].split("```")[0].strip()
                        elif "```" in json_str:
                            json_str = json_str.split("```")[1].split("```")[0].strip()

                        classification = json.loads(json_str)

                        # Extract fields with defaults
                        log_type = classification.get("log_type", "unknown").lower()
                        log_subtype = classification.get("log_subtype", "general").lower()
                        entities = classification.get("entities", {})

                        return log_type, log_subtype, entities
                    except json.JSONDecodeError as e:
                        logger.error(f"Could not parse Gemini response as JSON: {e}")
                        logger.debug(f"Raw response: {text_response}")
                else:
                    logger.warning("No candidates in Gemini response")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")

    # Return unknowns if we couldn't get a valid response
    return "unknown", "unknown", {}

def classify_by_pattern(text: str, patterns: Dict[str, List[str]]) -> Tuple[str, float]:
    """
    Classify text based on regex patterns.

    Returns:
        Tuple of (type, confidence_score)
    """
    best_match = "unknown"
    best_score = 0.0

    for log_type, pattern_list in patterns.items():
        match_count = 0

        for pattern in pattern_list:
            if re.search(pattern, text):
                match_count += 1

        # Calculate score based on how many patterns matched
        if pattern_list:
            score = match_count / len(pattern_list)
            if score > best_score:
                best_score = score
                best_match = log_type

    return best_match, best_score

def classify_subtype(text: str, primary_type: str, subtype_patterns: List[Tuple[str, str]]) -> Tuple[str, float]:
    """
    Classify the subtype based on the primary type.

    Returns:
        Tuple of (subtype, confidence_score)
    """
    best_match = "general"
    best_score = 0.0

    for subtype, pattern in subtype_patterns:
        if re.search(pattern, text):
            # Simple scoring - first match wins
            return subtype, 1.0

    return best_match, best_score

def extract_entities(text: str) -> Dict[str, List[str]]:
    """Extract entities like IPs, URLs, emails from the log text"""
    entities = {}

    for entity_type, pattern in ENTITY_PATTERNS.items():
        matches = re.findall(pattern, text)
        if matches:
            entities[entity_type] = list(set(matches))  # Remove duplicates

    return entities

def generate_tags(
    log_data: Dict[str, Any],
    log_type: str,
    log_subtype: str,
    entities: Dict[str, List[str]]
) -> List[str]:
    """Generate tags based on log classification and content"""
    tags = []

    # Add log type and subtype as tags
    if log_type and log_type != "unknown":
        tags.append(log_type)
        if log_subtype and log_subtype != "unknown" and log_subtype != "general":
            tags.append(log_subtype)

    # Add service name as tag if available
    if "service_name" in log_data and log_data["service_name"]:
        service_tag = log_data["service_name"].lower().replace(" ", "_")
        tags.append(service_tag)

    # Add environment as tag if available
    if "environment" in log_data and log_data["environment"]:
        env_tag = log_data["environment"].lower()
        tags.append(env_tag)

    # Add level as tag if it's ERROR or higher
    if "level" in log_data and log_data["level"]:
        level = log_data["level"].upper()
        if level in ["ERROR", "CRITICAL", "FATAL"]:
            tags.append(level.lower())
            # Add 'critical' tag for high-severity issues
            if level in ["CRITICAL", "FATAL"]:
                tags.append("critical")

    # Add some entity-based tags
    if "ip_address" in entities:
        tags.append("ip")
    if "email" in entities:
        tags.append("email")
    if "url" in entities:
        tags.append("url")

    # Keep only unique tags
    return list(set(tags))

# Add additional classification methods as needed
# For example, you could integrate with machine learning models or external services
