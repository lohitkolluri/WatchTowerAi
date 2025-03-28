import google.generativeai as genai
from ..config import settings
from ..schemas import LogEntryCreate
import logging

logger = logging.getLogger(__name__)

# Configure the Google Generative AI (Gemini) package with your API key.
genai.configure(api_key=settings.GEMINI_API_KEY)

# Setup the generation configuration.
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192
}

# Create the generative model.
model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    generation_config=generation_config,
)

async def call_gemini_api(log: LogEntryCreate) -> str:
    """
    Use the google-generativeai package to generate a remediation suggestion.
    Builds a prompt from the log details and starts a chat session.
    """
    prompt = (
        f"Analyze the following log entry and provide a remediation suggestion if applicable:\n\n"
        f"Service: {log.service_name}\n"
        f"Environment: {log.environment}\n"
        f"Level: {log.level}\n"
        f"Message: {log.message}\n"
    )
    try:
        chat_session = model.start_chat(history=[])
        response = chat_session.send_message(prompt)
        remediation = response.text if response and hasattr(response, "text") else ""
        return remediation
    except Exception as exc:
        logger.error(f"Google Gemini API call failed: {exc}")
        return ""
