import google.generativeai as genai
from ..config import settings
from ..schemas import LogEntryCreate
import logging
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

# Configure the Google Generative AI (Gemini) package with your API key.
genai.configure(api_key=settings.GEMINI_API_KEY)

# Setup the generation configuration.
generation_config = {
    "temperature": 0.7,  # Reduced from 1.0 to make responses more focused
    "top_p": 0.8,        # Reduced from 0.95 for more deterministic responses
    "top_k": 40,
    "max_output_tokens": 4096,  # Reduced from 8192 to minimize recitation issues
    # Removed invalid response_mime_type parameter
}

# Create the generative model.
model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    generation_config=generation_config,
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    reraise=True
)
async def call_gemini_api(log: LogEntryCreate) -> str:
    """
    Use the google-generativeai package to generate a remediation suggestion.
    Builds a prompt from the log details and starts a chat session.

    Args:
        log: The log entry to analyze

    Returns:
        str: AI-generated remediation suggestion or empty string on failure
    """
    prompt = (
        f"You are a senior system administrator analyzing a log entry. "
        f"Provide a brief, focused remediation suggestion, no more than 200 words.\n\n"
        f"Log details:\n"
        f"- Service: {log.service_name}\n"
        f"- Environment: {log.environment}\n"
        f"- Level: {log.level}\n"
        f"- Message: {log.message}\n"
    )
    try:
        # Add a small delay to prevent rate limiting
        time.sleep(0.1)

        # Use direct completion instead of chat to minimize recitation issues
        response = model.generate_content(prompt)

        # Check for empty or error responses
        if not response or not hasattr(response, "text"):
            logger.warning("Empty Gemini API response")
            return "No remediation suggestion available."

        # Check for recitation issues
        if hasattr(response, "finish_reason") and response.finish_reason == "RECITATION":
            logger.warning("Gemini response had RECITATION finish reason")
            return "Unable to generate suggestion - please check logs manually."

        # Extract the text, trimming any unnecessary content
        remediation = response.text.strip()
        if not remediation:
            return "No applicable remediation suggestion for this log."

        return remediation

    except Exception as exc:
        logger.error(f"Google Gemini API call failed: {exc}")
        return "API error occurred while generating remediation suggestion."
