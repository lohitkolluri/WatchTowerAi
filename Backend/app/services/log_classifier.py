import logging
import re
import json
import httpx
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
from ..config import settings
from . import gemini as gemini_api

# Replace standard logging with Loguru
from loguru import logger

# Constants for Gemini API
API_KEY = settings.GEMINI_API_KEY
MODEL_NAME = "gemini-2.5-flash-lite"  # Using the same model as in gemini.py

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

async def classify_log(log_entry: dict) -> Tuple[str, str, float, Dict[str, List[str]], List[str]]:
    """
    Classify a log entry using a hybrid approach of pattern-based classification and AI classification.
    Returns a tuple of (log_type, log_subtype, confidence_score, entities, tags).
    """
    logger.debug(f"Starting classification for log entry: {log_entry}")

    # Extract text to classify
    text_to_classify = f"{log_entry.get('message', '')} {log_entry.get('error_code', '')}"
    logger.debug(f"Text to classify: {text_to_classify}")

    # First try pattern-based classification
    log_type, pattern_confidence = classify_by_pattern(text_to_classify, LOG_PATTERNS)
    logger.debug(f"Pattern classification result - Type: {log_type}, Confidence: {pattern_confidence}")

    # Get subtype and additional confidence
    log_subtype, subtype_confidence = classify_subtype(text_to_classify, log_type, LOG_SUBTYPES.get(log_type, []))
    logger.debug(f"Subtype classification result - Subtype: {log_subtype}, Confidence: {subtype_confidence}")

    # Extract entities
    entities = extract_entities(text_to_classify)
    logger.debug(f"Extracted entities: {entities}")

    # Calculate initial confidence score as weighted average
    confidence_score = (pattern_confidence * 0.6 + subtype_confidence * 0.4)
    logger.debug(f"Initial confidence score: {confidence_score}")

    # Try AI classification if:
    # 1. Confidence is below threshold OR
    # 2. Log type is unknown OR
    # 3. Log subtype is general
    should_try_ai = (
        confidence_score < 0.85 or
        log_type == "unknown" or
        log_subtype == "general"
    )

    if should_try_ai:
        try:
            logger.debug("Attempting AI classification")
            is_available, _ = await gemini_api.check_gemini_api_availability()
            if is_available:
                try:
                    ai_type, ai_subtype, ai_entities = await classify_with_gemini(text_to_classify)
                    logger.debug(f"AI classification result - Type: {ai_type}, Subtype: {ai_subtype}")

                    # Use AI classification if it provides more specific results
                    if ai_type != "unknown" and (log_type == "unknown" or confidence_score < 0.85):
                        log_type = ai_type
                        confidence_score = 0.85  # Base confidence for AI classification

                    if ai_subtype != "general" and (log_subtype == "general" or subtype_confidence < 0.7):
                        log_subtype = ai_subtype
                        confidence_score = min(1.0, confidence_score + 0.1)  # Boost confidence for specific subtype

                    # Merge AI entities with pattern-based entities
                    entities.update(ai_entities)
                    logger.debug(f"Updated classification with AI results - Type: {log_type}, Subtype: {log_subtype}, Confidence: {confidence_score}")
                except Exception as e:
                    logger.error(f"Error in AI classification processing: {e}")
                    # Continue with pattern-based results
            else:
                logger.warning("Gemini API not available, using pattern-based classification only")
        except Exception as e:
            logger.error(f"Error in AI classification: {e}")
            # Continue with pattern-based results

    # Generate tags based on classification
    tags = generate_tags(log_type, log_subtype, entities)
    logger.debug(f"Generated tags: {tags}")

    # Ensure confidence score is between 0 and 1
    confidence_score = max(0.0, min(1.0, confidence_score))

    logger.info(f"Classification complete - Type: {log_type}, Subtype: {log_subtype}, Score: {confidence_score:.2f}")
    return log_type, log_subtype, confidence_score, entities, tags

async def classify_with_gemini(text: str) -> Tuple[str, str, Dict[str, List[str]]]:
    """
    Use Gemini AI to classify log entries when pattern-based approach has low confidence.
    
    Uses structured prompt engineering:
    - JSON schema requirements
    - Classification taxonomy
    - Examples for reference
    - Strict output format

    Args:
        text: The log text to classify

    Returns:
        Tuple containing:
        - log_type: Primary log type
        - log_subtype: More specific subtype
        - entities: Extracted entities
    """
    # Define the classification taxonomy
    valid_types = ['database', 'auth', 'request', 'performance', 'security', 'infrastructure', 'application', 'unknown']
    
    # Create structured prompt for Gemini with better engineering
    prompt = (
        "You are a senior log analysis expert with expertise in production systems monitoring.\n"
        "Your task is to classify log entries with high accuracy.\n\n"
        
        "CLASSIFICATION TAXONOMY:\n"
        "1. database: Connection errors, query failures, transaction issues, deadlocks\n"
        "2. auth: Authentication failures, authorization issues, token problems, permission denials\n"
        "3. request: HTTP errors, API failures, client/server errors, bad requests\n"
        "4. performance: Slow responses, high latency, memory issues, CPU spikes\n"
        "5. security: Security breaches, injection attacks, unauthorized access, suspicious behavior\n"
        "6. infrastructure: Server failures, network issues, deployment problems, resource constraints\n"
        "7. application: Application logic errors, business logic failures, custom exceptions\n"
        "8. unknown: Cannot classify into above categories\n\n"
        
        "SUBTYPES EXAMPLES:\n"
        "- database: connection_error, query_error, transaction_failure, deadlock, timeout\n"
        "- auth: login_failure, token_expired, permission_denied, invalid_credentials\n"
        "- request: client_error (4xx), server_error (5xx), timeout, bad_request\n"
        "- performance: high_latency, memory_leak, cpu_spike, throughput_degradation\n"
        "- security: injection_attack, unauthorized_access, malicious_activity, breach\n"
        "- infrastructure: server_down, network_failure, deployment_issue, resource_exhaustion\n\n"
        
        "ENTITIES TO EXTRACT:\n"
        "- ip_address: IPv4 or IPv6 addresses\n"
        "- email: Email addresses\n"
        "- url: URLs or URIs\n"
        "- user_id: User identifiers\n"
        "- error_code: Error codes or exception IDs\n"
        "- timestamp: Timestamps or time references\n"
        "- hostname: Server or host names\n\n"
        
        "INSTRUCTIONS:\n"
        "1. Analyze the log message carefully\n"
        "2. Return ONLY valid JSON (no markdown, no explanations)\n"
        "3. log_type MUST be one of the 8 types above\n"
        "4. log_subtype should be specific and descriptive\n"
        "5. entities should be a dict with lists of values\n"
        "6. If confidence is low, use 'unknown' for log_type\n\n"
        
        "RESPONSE FORMAT (valid JSON only):\n"
        "{\n"
        '  "log_type": "one of the 8 types",\n'
        '  "log_subtype": "specific subtype",\n'
        '  "confidence": 0.0-1.0,\n'
        '  "severity": "low|medium|high|critical",\n'
        '  "entities": {"entity_type": ["value1", "value2"]}\n'
        "}\n\n"
        
        f"LOG TO CLASSIFY:\n{text}"
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
                    logger.debug(f"Raw Gemini response: {text_response[:200]}...")

                    # Try to extract JSON from the response
                    try:
                        # First try direct JSON parse
                        try:
                            classification = json.loads(text_response)
                            return _parse_classification_response(classification, valid_types)
                        except json.JSONDecodeError:
                            pass
                        
                        # Try to find JSON block in response
                        json_matches = re.findall(r'\{[^}]*(?:\{[^}]*\}[^}]*)*\}', text_response, re.DOTALL)
                        if json_matches:
                            for json_str in json_matches:
                                try:
                                    classification = json.loads(json_str)
                                    return _parse_classification_response(classification, valid_types)
                                except json.JSONDecodeError:
                                    continue

                        # Fallback: try to extract key-value pairs
                        log_type = "unknown"
                        log_subtype = "unknown"
                        
                        log_type_match = re.search(r'(?i)"?log[_]?type"?\s*:\s*"?([a-zA-Z_]+)"?', text_response)
                        if log_type_match:
                            log_type = log_type_match.group(1).lower()
                            if log_type not in valid_types:
                                log_type = "unknown"
                        
                        subtype_match = re.search(r'(?i)"?(?:log_)?subtype"?\s*:\s*"?([a-zA-Z_]+)"?', text_response)
                        if subtype_match:
                            log_subtype = subtype_match.group(1).lower()

                        entities = extract_entities(text_response)
                        return log_type, log_subtype, entities

                    except Exception as e:
                        logger.error(f"Error processing Gemini response: {e}")
                        logger.debug(f"Problematic response: {text_response}")
                else:
                    logger.warning("No candidates in Gemini response")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            raise

    # Only return unknown if we truly couldn't process the response
    return "unknown", "unknown", {}

def _parse_classification_response(classification: dict, valid_types: List[str]) -> Tuple[str, str, Dict]:
    """Parse and validate classification response from Gemini."""
    log_type = classification.get("log_type", "unknown").lower()
    log_subtype = classification.get("log_subtype", "general").lower()
    entities = classification.get("entities", {})
    
    # Validate log_type
    if log_type not in valid_types:
        log_type = "unknown"
    
    return log_type, log_subtype, entities

def classify_by_pattern(text: str, patterns: Dict[str, List[str]]) -> Tuple[str, float]:
    """
    Classify text based on regex patterns with improved confidence scoring.

    Args:
        text: Text to classify
        patterns: Dictionary of pattern lists by type

    Returns:
        Tuple of (type, confidence_score)
    """
    matches = {}
    total_patterns = 0
    text_lower = text.lower()

    # Count matches for each type
    for log_type, pattern_list in patterns.items():
        matches[log_type] = 0
        total_patterns += len(pattern_list)

        for pattern in pattern_list:
            if re.search(pattern, text):
                # Add base match score
                matches[log_type] += 1

                # Boost score for multiple matches of the same pattern
                all_matches = len(re.findall(pattern, text))
                if all_matches > 1:
                    matches[log_type] += min(0.2, 0.1 * (all_matches - 1))

    if not any(matches.values()):
        return "unknown", 0.0

    # Find type with highest match count
    best_type = max(matches.items(), key=lambda x: x[1])[0]

    # Calculate confidence score
    pattern_count = len(patterns[best_type])
    base_confidence = matches[best_type] / pattern_count if pattern_count > 0 else 0

    # Apply additional confidence modifiers
    confidence = base_confidence

    # Boost confidence if matches are significantly higher than other types
    next_best_count = max((count for type_, count in matches.items() if type_ != best_type), default=0)
    if matches[best_type] > next_best_count + 1:
        confidence = min(1.0, confidence + 0.1)

    # Reduce confidence if multiple types have similar match counts
    similar_matches = sum(1 for count in matches.values() if count > 0 and count >= matches[best_type] - 1)
    if similar_matches > 1:
        confidence = max(0.0, confidence - 0.1 * (similar_matches - 1))

    return best_type, confidence

def classify_subtype(text: str, primary_type: str, subtype_patterns: List[Tuple[str, str]]) -> Tuple[str, float]:
    """
    Classify the subtype based on the primary type with improved confidence scoring.

    Args:
        text: Text to classify
        primary_type: Primary log type
        subtype_patterns: List of (subtype, pattern) tuples

    Returns:
        Tuple of (subtype, confidence_score)
    """
    if not subtype_patterns:
        return "general", 0.5

    matches = []
    text_lower = text.lower()

    for subtype, pattern in subtype_patterns:
        if re.search(pattern, text):
            # Count matches for confidence calculation
            match_count = len(re.findall(pattern, text))
            pattern_length = len(pattern.strip())

            # Calculate match quality score
            # Longer patterns and multiple matches increase confidence
            quality_score = min(1.0, 0.6 + (pattern_length / 100) + (0.1 * (match_count - 1)))

            matches.append((subtype, quality_score))

    if not matches:
        # If primary type is known but no subtype matches, return general
        return "general", 0.5 if primary_type != "unknown" else 0.0

    # Sort by confidence score
    matches.sort(key=lambda x: x[1], reverse=True)
    best_match = matches[0]

    # If multiple subtypes match with similar confidence, reduce confidence
    if len(matches) > 1 and abs(matches[0][1] - matches[1][1]) < 0.2:
        confidence = max(0.5, best_match[1] - 0.1)
    else:
        confidence = best_match[1]

    return best_match[0], confidence

def extract_entities(text: str) -> Dict[str, List[str]]:
    """Extract entities like IPs, URLs, emails from the log text"""
    entities = {}

    for entity_type, pattern in ENTITY_PATTERNS.items():
        matches = re.findall(pattern, text)
        if matches:
            entities[entity_type] = list(set(matches))  # Remove duplicates

    return entities

def generate_tags(
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
