# 🚨 WatchTowerAI Backend Documentation

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb)
![Loguru](https://img.shields.io/badge/Loguru-Blue?style=for-the-badge)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-Red?style=for-the-badge)
![SMTP](https://img.shields.io/badge/SMTP-Orange?style=for-the-badge)

---

## 📖 Overview

WatchTowerAI is an **AI-powered API monitoring and alerting backend** designed to detect anomalies, analyze logs, monitor API performance, and manage alerts with AI-generated remediation recommendations.

---

## 📌 Table of Contents

- [Tech Stack](#🔧-tech-stack)
- [Project Structure](#📂-project-structure)
- [API Features](#🚀-api-features)
- [Key Components](#📦-key-components)
  - [Gemini AI Integration](#🧠-gemini-ai-integration)
  - [Email Alert System](#📨-email-alert-system)
  - [Data Models and Schemas](#📑-data-models-and-schemas)
  - [Database Management](#🗃️-database-management)
  - [Configuration Management](#⚙️-configuration-management)
- [Installation & Setup](#🛠️-installation--setup)
- [Authentication](#🔐-authentication)
- [API Endpoints](#📡-api-endpoints-overview)
- [Alerts & Notifications](#📩-alerts--notifications)
- [Metrics & Analytics](#📈-metrics--analytics)
- [Error Handling & Resilience](#🛡️-error-handling--resilience)
- [License](#📃-license)
- [Contact](#📞-contact)

---

## 🔧 Tech Stack

- **Backend Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **Database:** [MongoDB](https://www.mongodb.com/) (Motor, AsyncIO)
- **Logging Framework:** [Loguru](https://github.com/Delgan/loguru)
- **AI Integration:** Google Gemini API
- **Background Tasks:** FastAPI BackgroundTasks
- **Email Alerts:** SMTP via `aiosmtplib`, Jinja2 templates
- **Data Validation:** [Pydantic v2](https://pydantic.dev/)

---

## 📂 Project Structure

```plaintext
Backend
├── app
│   ├── services
│   │   ├── email_alert.py
│   │   ├── gemini.py
│   │   ├── log_classifier.py
│   │   └── log_processor.py
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── schemas.py
├── email_templates
│   ├── alert_email.html
│   └── notification_email.html
├── .env
├── .env.example
├── README.md
└── requirements.txt
```

---

## 🚀 API Features

- **Universal API Monitoring**: Monitors any endpoint automatically.
- **AI-powered Log Classification**: Auto-classifies logs and extracts relevant entities.
- **Real-time Alerting**: Instant email notifications with actionable AI suggestions.
- **Comprehensive Metrics**: Real-time tracking and historical analysis.
- **Advanced Log Search**: Powerful querying capabilities based on type, tags, entities, and confidence scores.
- **Intelligent Alert Management**: Easily manage and acknowledge alerts through APIs.

---

## 📦 Key Components

### 🧠 Gemini AI Integration

Integrates Google Gemini AI to generate real-time remediation suggestions based on log data.

### 📨 Email Alert System

Automatically sends structured, formatted email alerts using Jinja2 templates and Markdown to HTML conversion.

### 📑 Data Models and Schemas

Uses robust Pydantic models for precise data validation, serialization, and deserialization.

### 🗃️ Database Management

Efficient asynchronous database operations with MongoDB via Motor, including automated indexing and retries.

### ⚙️ Configuration Management

Centralized management of environment variables with `.env` files, supporting fallback modes for development.

---

## 🛠️ Installation & Setup

### Prerequisites

- Python 3.9+
- MongoDB Database
- SMTP Server
- Google Gemini API key

### Steps to Install

```bash
# Clone the repository
git clone https://github.com/lohitkolluri/WatchTowerAi
cd WatchTowerAi/Backend

# Setup environment
python -m venv env
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
vim .env

# Start application
uvicorn main:app --reload
```

---

## 🔐 Authentication

Supports:
- **API Key**: Include via `X-API-Key` header.
- **OAuth2**: Token via `/token` endpoint.

---

## 📡 API Endpoints Overview

| Method | Endpoint        | Description                  |
|--------|-----------------|------------------------------|
| POST   | `/ingest`       | Log ingestion                |
| GET    | `/logs`         | Retrieve logs                |
| GET    | `/alerts`       | Manage alerts                |
| PATCH  | `/alerts/{id}`  | Update alert status          |
| GET    | `/metrics`      | Get service metrics          |
| POST   | `/monitor/api`  | API endpoint monitoring      |
| GET    | `/health`       | Health check                 |

---

## 📩 Alerts & Notifications

AI-driven alerts with email notifications providing immediate and actionable insights.

---

## 📈 Metrics & Analytics

Real-time and historical analytics for monitoring performance and identifying issues proactively.

---

## 🛡️ Error Handling & Resilience

Incorporates retry logic and fallback mechanisms to ensure robust and reliable operations.

---

## 📃 License

Distributed under the MIT License.

---

## 📞 Contact

**Lohit Kolluri** - [me@lohit.is-a.dev](mailto:me@lohit.is-a.dev)
