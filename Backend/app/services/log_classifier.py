import logging
import re
import json
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

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

    # Generate tags
    tags = generate_tags(log_data, log_type, log_subtype, entities)

    return log_type, log_subtype, confidence, entities, tags

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
    """Extract structured entities from the log text."""
    entities = {}

    for entity_type, pattern in ENTITY_PATTERNS.items():
        matches = re.findall(pattern, text)
        if matches:
            entities[entity_type] = matches

    return entities

def generate_tags(
    log_data: Dict[str, Any],
    log_type: str,
    log_subtype: str,
    entities: Dict[str, List[str]]
) -> List[str]:
    """Generate tags based on the log classification and content."""
    tags = []

    # Add type and subtype as tags
    if log_type != "unknown":
        tags.append(log_type)

    if log_subtype != "general" and log_subtype != "unknown":
        tags.append(log_subtype)

    # Add severity related tags
    if "level" in log_data:
        level = str(log_data.get("level", "")).upper()
        if level in ["ERROR", "CRITICAL", "FATAL"]:
            tags.append("error")

        if level in ["CRITICAL", "FATAL"]:
            tags.append("critical")

    # Add service name if available
    if "service_name" in log_data and log_data["service_name"]:
        tags.append(f"service:{log_data['service_name']}")

    # Add environment if available
    if "environment" in log_data and log_data["environment"]:
        tags.append(f"env:{log_data['environment']}")

    return tags

# Add additional classification methods as needed
# For example, you could integrate with machine learning models or external services
