<p align="center">
  <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status"/>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
  <a href="#-technology-stack">
    <img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat&logo=python&logoColor=white" alt="Python Version"/>
  </a>
  <a href="#-technology-stack">
    <img src="https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi&logoColor=white" alt="FastAPI"/>
  </a>
  <a href="#-technology-stack">
    <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB"/>
  </a>
  <a href="#-technology-stack">
    <img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=flat&logo=google&logoColor=white" alt="Google Gemini"/>
  </a>
</p>

<h1 align="center">🦅 WatchTowerAI Backend 📊🤖</h1>

<div align="center">
  <strong>The intelligent core powering WatchTowerAI.</strong><br/>
  <em>AI-enhanced backend service for log ingestion, monitoring, and smart alerting — built with FastAPI, MongoDB, and Google Gemini.</em>
</div>


---

## 📜 Overview

<div style="text-align: justify;">
WatchTowerAI Backend is designed to be the central nervous system for monitoring modern applications. It ingests logs and API traffic, leverages AI for deep analysis and classification, identifies potential issues, suggests remediations, and notifies relevant parties. Its asynchronous nature ensures high throughput and responsiveness, making it suitable for demanding environments. The system aims to reduce mean time to detection (MTTD) and mean time to resolution (MTTR) by providing context-rich alerts and actionable insights.
</div>

---

## ✨ Core Features

*   **🚀 Universal Ingestion:** Seamlessly accept logs via `POST /ingest` or monitor *any* API endpoint automatically using the powerful `/{path:path}` catch-all route. No need for complex agent setups for basic API monitoring.
*   **🧠 AI-Powered Classification:** Intelligently categorize incoming logs (e.g., `database`, `auth`, `request`) and assign specific subtypes (`connection_error`, `login_failure`) using a robust hybrid engine combining RegEx patterns and Google Gemini for high accuracy and adaptability to new log formats.
*   **🔍 Entity Extraction:** Automatically pull out critical information like IP addresses, email addresses, user IDs, error codes, and URLs from log messages for richer context and powerful, targeted searching.
*   **🚨 Smart Alerting & Remediation:**
    *   Generate detailed alerts in MongoDB for critical issues (`ERROR`, `CRITICAL`, `FATAL`).
    *   Leverage **Google Gemini** to provide concise, AI-generated **remediation suggestions** directly within alerts and notifications, significantly speeding up troubleshooting.
*   **📧 Intelligent Notifications:** Dispatch informative HTML email alerts (powered by Jinja2 & Markdown conversion) for high-priority issues, complete with context, classification details, and AI-driven solutions.
*   **📈 Comprehensive Metrics:** Persistently track key performance indicators, including log volumes, error counts, API response times, status code distributions, and classification breakdowns per service and environment.
*   **🌐 Active API Monitoring:** Register and actively probe external API endpoints. Track uptime, latency, status codes, and response payloads. Store historical performance data and trigger alerts on failures or deviations from expected behavior.
*   **🔎 Advanced Search:** Query logs with high precision using filters for log type, subtype, extracted entities, confidence scores, tags, service names, environments, and time ranges via `GET /logs/search`.
*   **🪵 Structured & Performant Logging:** Utilize **Loguru** for beautiful, structured (JSON to file), and asynchronous logging, providing deep insights during development and production without performance bottlenecks.
*   **⚡ Asynchronous Foundation:** Built entirely on an async stack (FastAPI, Motor, HTTPX) for maximum concurrency and performance under load.

---

## 🏗️ Architecture

<div style="text-align: justify;">
The backend follows a service-oriented approach built on FastAPI, interacting asynchronously with MongoDB and Google Gemini. It prioritizes decoupling of concerns, allowing for scalability and maintainability.
</div>

```mermaid
graph TD
    subgraph "External World"
        A[Client / Log Source / API Call] --> B{WatchTowerAI Backend};
        Z[Monitored External API]
    end

    subgraph "WatchTowerAI Backend (FastAPI App)"
        style FastAPIApp fill:#D6EAF8,stroke:#2980B9
        B -- /ingest --> C[Ingest Endpoint];
        B -- /{path:path} --> D[Catch-All Endpoint];
        B -- /logs, /alerts, etc. --> E[Data Access Endpoints];
        B -- /monitor/api, /api/endpoints --> F[API Monitoring Endpoints];
        B -- /token --> G[Mock Auth Endpoint];

        C --> I[BackgroundTasks];
        D --> I;
        F -- Initiate Monitor --> I_MON[BackgroundTasks];

        E --> K{Database Service};
        F --> K;
        G --> B; % Mock response
    end

    subgraph "Core Processing Services"
        style CoreProcessing fill:#E8F4F8,stroke:#3498DB
        I --> J{Log Processor};
        J --> L[Log Classifier];
        L -- Regex Patterns --> L;
        L -- Low Confidence --> M{Gemini Service};
        J -- Store/Update --> K;
        J -- High Severity --> N{Alert Creation};
        N --> M; % Get Remediation
        N --> O{Email Service};
        J --> Q{Metrics Service};

        I_MON --> S{API Monitor Task};
        S --> T{HTTPX Client};
        S -- Store Results --> K;
        S -- Update Metrics --> Q;
        S -- Failure --> N; % Trigger Alert Creation

        M -- Classify/Remediate --> U[Google Gemini API];
        O -- Send Email --> R[SMTP Server];
        Q -- Update --> K;
        T -- Call --> Z;
    end

    subgraph "Data Persistence (MongoDB via Motor)"
        style DataPersistence fill:#E8F8F5,stroke:#1ABC9C
        K --> V[LogEntries Collection];
        K --> W[Alerts Collection];
        K --> X[Metrics Collection];
        K --> Y[APIMonitors Collection];
        K --> AA[APIEndpoints Collection];
        K --> BB[EndpointPings Collection];
    end

    subgraph "External Dependencies"
         style ExternalDeps fill:#FEF9E7,stroke:#F39C12
         U; Z; R;
    end

    classDef default fill:#FFF,stroke:#333,stroke-width:2px;
    classDef endpoint fill:#D6EAF8,stroke:#2980B9,font-weight:bold;
    classDef service fill:#D1F2EB,stroke:#16A085;
    classDef external fill:#FCF3CF,stroke:#F1C40F,font-style:italic;
    classDef db fill:#D5F5E3,stroke:#27AE60;
    classDef task fill:#EBDEF0,stroke:#8E44AD;


    class B,C,D,E,F,G endpoint;
    class J,L,M,N,O,Q,S,T,K service;
    class V,W,X,Y,AA,BB db;
    class U,Z,R external;
    class I,I_MON task;
```

**Architectural Flow Highlights:**

1.  **Ingestion:** Logs arrive at dedicated or catch-all endpoints. FastAPI quickly hands off processing to `BackgroundTasks` to keep endpoints responsive.
2.  **Processing Pipeline:** The `Log Processor` acts as an orchestrator, invoking the `Log Classifier` (using RegEx initially, then Gemini AI if needed) and the `Gemini Service` for remediation. It coordinates updates to multiple MongoDB collections (`LogEntries`, `Alerts`, `Metrics`) and triggers notifications via the `Email Service`.
3.  **API Monitoring Loop:** Endpoints are managed via specific API routes. Monitoring jobs run as background tasks, using `HTTPX` for asynchronous external calls. Results feed back into the database for persistence, metrics aggregation, and potential alert generation.
4.  **Data Access:** API endpoints retrieve formatted data by querying the `Database Service` layer, which interacts directly with the MongoDB collections using the async `Motor` driver.

---

## 🛠️ Technology Stack

| Category          | Technology                                                                                                                                                              | Role & Rationale                                       |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **Framework**     | <img src="https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi&logoColor=white" alt="FastAPI">                                                             | Modern, high-performance async web framework.          |
| **Web Server**    | <img src="https://img.shields.io/badge/Uvicorn-2A9D8F?style=flat&logo=python&logoColor=white" alt="Uvicorn"> / <img src="https://img.shields.io/badge/Gunicorn-499848?style=flat&logo=python&logoColor=white" alt="Gunicorn"> | ASGI server for running FastAPI (Gunicorn for prod). |
| **Database**      | <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB"> (with <img src="https://img.shields.io/badge/Motor-000000?style=flat&logo=python&logoColor=white" alt="Motor">) | Flexible NoSQL storage, async access via Motor.      |
| **AI**            | <img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=flat&logo=google&logoColor=white" alt="Google Gemini">                                               | Advanced log classification & remediation generation.  |
| **Logging**       | <img src="https://img.shields.io/badge/Loguru-38B2AC?style=flat&logo=python&logoColor=white" alt="Loguru">                                                               | Enjoyable, powerful, structured async logging.         |
| **Validation**    | <img src="https://img.shields.io/badge/Pydantic-E97627?style=flat&logo=pydantic&logoColor=white" alt="Pydantic">                                                          | Robust data validation and settings management.        |
| **Templating**    | <img src="https://img.shields.io/badge/Jinja2-B41717?style=flat&logo=jinja&logoColor=white" alt="Jinja2">                                                                | Generating dynamic HTML emails.                        |
| **HTTP Client**   | <img src="https://img.shields.io/badge/HTTPX-00A86B?style=flat&logo=python&logoColor=white" alt="HTTPX">                                                                 | Asynchronous HTTP requests for API monitoring.       |
| **Markdown**      | <img src="https://img.shields.io/badge/Markdown-000000?style=flat&logo=markdown&logoColor=white" alt="Markdown">                                                          | Rendering Gemini's Markdown output into HTML emails.   |
| **Configuration** | `python-dotenv`, `pydantic-settings`                                                                                                                                    | Secure and typed environment variable loading.         |
| **Retry Logic**   | `Tenacity`                                                                                                                                                              | Making external calls (DB, Gemini) more resilient.   |
| **Language**      | <img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat&logo=python&logoColor=white" alt="Python">                                                          | Core language leveraging modern async features.        |

---

## 📋 Prerequisites

*   🐍 **Python:** Version 3.11 or newer.
*   📦 **Pip:** Standard Python package installer.
*   💾 **MongoDB:** A running MongoDB instance (v4.4+). Can be local, Dockerized, or cloud-hosted (e.g., MongoDB Atlas). Ensure network connectivity.
*   🔑 **Google Gemini API Key:** Obtain from [Google AI Studio](https://aistudio.google.com/).
*   ✉️ **SMTP Credentials:** Valid SMTP server details for sending email alerts.
*   🐙 **Git:** Version control system for cloning.

---

## 🚀 Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/lohitkolluri/WatchTowerAi
    cd WatchTowerAi/Backend # Or your chosen directory name
    ```

2.  **Create & Activate Virtual Environment** (Highly Recommended):
    ```bash
    # Linux/macOS
    python3 -m venv venv
    source venv/bin/activate

    # Windows (Git Bash/WSL)
    python3 -m venv venv
    source venv/Scripts/activate
    # Windows (Command Prompt/PowerShell)
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment:**
    *   Create a `.env` file in the `Backend` root (copy `.env.example` if provided).
    *   Fill in your specific details:

    ```dotenv
    # .env - Local Development Configuration Example

    # --- MongoDB ---
    MONGODB_URI="mongodb://localhost:27017"
    # MONGODB_URI="mongodb+srv://<user>:<password>@<your-atlas-cluster>/?retryWrites=true&w=majority"
    MONGODB_DB_NAME="watchtower_dev"

    # --- Google Gemini ---
    GEMINI_API_KEY="PASTE_YOUR_GEMINI_API_KEY_HERE"

    # --- SMTP Email Alerts ---
    SMTP_SERVER="smtp.mailtrap.io" # Example using Mailtrap for testing
    SMTP_PORT=587
    SMTP_USERNAME="mailtrap_username"
    SMTP_PASSWORD="mailtrap_password"
    EMAIL_FROM="WatchTowerAI <alerts@yourdomain.com>"
    ALERT_RECIPIENT="your_test_inbox@yourdomain.com"

    # --- Optional ---
    # ENABLE_FALLBACK_MODE=false # Set to true only for dev without DB
    ```
    > **Security Note:** Never commit your `.env` file containing sensitive keys or passwords to version control. Use environment variables directly or a secrets management system in production.

---

## ▶️ Running the Application

Ensure your virtual environment is activated.

1.  **Development (Live Reload):**
    *   Ideal for coding and testing locally.
    *   Execute from the `Backend` directory:
        ```bash
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
        ```
    *   🚀 API available at `http://localhost:8000`
    *   📚 Interactive docs at `http://localhost:8000/docs`

2.  **Production (Gunicorn):**
    *   Recommended for deployment stability and performance.
    *   Configure production environment variables securely.
    *   Execute from the `Backend` directory:
        ```bash
        gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
        ```
    *   Adjust `--workers` based on available CPU cores (e.g., `2 * num_cores + 1`).
    *   🛡️ **Crucial:** Deploy behind a reverse proxy (Nginx, Traefik) for HTTPS, load balancing, and enhanced security.

---

## 📖 API Documentation (Interactive)

Explore and interact with the API endpoints directly in your browser:

*   <img src="https://img.shields.io/badge/Swagger%20UI-85EA2D?style=flat&logo=swagger&logoColor=black" alt="Swagger UI"> **Swagger UI:** `http://localhost:8000/docs`
*   <img src="https://img.shields.io/badge/ReDoc-red?style=flat" alt="ReDoc"> **ReDoc:** `http://localhost:8000/redoc`

Use the **`Authorize`** button to test secured endpoints:
*   `apiKeyAuth`: Provide an API key in the `X-API-Key` header.
*   `oauth2Auth`: Use the `/token` endpoint (dev password: `watchtower`) to obtain a temporary bearer token. *(Remember this is a mock implementation)*.

---

## ⚙️ How It Works: Deeper Dive

<div style="text-align: justify;">
The system is designed around asynchronous processing and leveraging external AI for intelligence. Log ingestion triggers a background workflow involving classification (RegEx -> Gemini), entity extraction, potential alert creation (with Gemini-powered remediation), email notification, and metrics updates. API monitoring follows a similar pattern: background tasks ping endpoints, store results, update metrics, and trigger alerts on failure. Motor ensures database operations don't block the event loop, while Loguru provides rich, non-blocking logging. Pydantic enforces data integrity at API boundaries and in configuration.
</div>

---

## 🪵 Logging Details

*   **Framework:** Loguru provides a superior logging experience.
*   **Console:** Real-time, colorized output (INFO+), great for development visibility.
*   **File:** Detailed, structured JSON logs in `logs/watchtower_YYYY-MM-DD.log` (DEBUG+), ideal for analysis and integration with log shippers (e.g., Filebeat).
*   **Features:** Includes timestamps, levels, code location, tracebacks, daily rotation, compression, and asynchronous handling.

---

## 🔒 Authentication & Security

*   **Current Implementation:**
    *   Basic API Key (`X-API-Key`) check for some routes.
    *   **Mock** OAuth2 `/token` endpoint for Swagger demonstration.
*   **⚠️ Production Security Requirements:**
    *   **Implement Real OAuth2/JWT:** Replace the mock `/token` flow. Use libraries like `python-jose` and `passlib` for token creation/validation and password hashing. Integrate with a user database.
    *   **RBAC (Role-Based Access Control):** Protect sensitive endpoints based on authenticated user roles/permissions.
    *   **Secure API Key Management:** If using API keys, generate securely, store hashed versions, and implement proper validation logic.
    *   **HTTPS Enforcement:** Mandatory via a reverse proxy.
    *   **Input Sanitization/Validation:** Rely on Pydantic's strict validation.
    *   **Rate Limiting:** Implement to prevent brute-force attacks and resource exhaustion (e.g., using `slowapi`).
    *   **Dependency Scanning:** Regularly scan `requirements.txt` for vulnerabilities (e.g., `pip-audit`, `safety`).

---

## 📜 License

This project is distributed under the **MIT License**. See the `LICENSE` file for more information.
