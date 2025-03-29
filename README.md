<div align="center">
  <h1>🚨 WatchTowerAI</h1>
  <p><strong>AI-powered API monitoring and alerting platform</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-documentation">API</a> •
    <a href="#intelligent-log-classification">Classification</a> •
    <a href="#universal-endpoint-monitoring">Monitoring</a>
  </p>

  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python" alt="Python 3.10+"/>
  <img src="https://img.shields.io/badge/Framework-FastAPI-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=google" alt="Google Gemini AI"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License"/>
</div>

---

## 🌟 Overview

WatchTowerAI is a comprehensive API monitoring and alerting system that uses artificial intelligence to detect, classify, and predict anomalies in your services. It helps development teams identify and resolve issues before they impact users by providing intelligent log analysis, proactive monitoring, and automated remediation suggestions.

## 🚀 Features

### Core Capabilities

- **Universal API Monitoring** - Monitor any endpoint with any data structure automatically
- **AI-powered Classification** - Intelligent log categorization and entity extraction
- **Advanced Search** - Find logs by type, entities, confidence scores, and more
- **Real-time Anomaly Detection** - With Google Gemini AI integration
- **Smart Alerting** - Automated alert generation with remediation suggestions
- **Email Notifications** - For critical issues using customizable templates
- **Flexible Data Storage** - MongoDB for scalable and schema-flexible storage

### Technical Highlights

- **Pattern Recognition** - Automatically identifies common error patterns
- **Entity Extraction** - Finds IPs, user IDs, emails, and other context in logs
- **Confidence Scoring** - Shows how certain the AI is about each classification
- **Auto-tagging** - Generates relevant tags for improved searchability
- **Automated Remediation** - AI-generated fix suggestions for common issues
- **Performance Metrics** - Track errors, response times, and service health

## 🛠️ Architecture

WatchTowerAI is built with modern, scalable technologies:

<table>
  <tr>
    <th>Component</th>
    <th>Technology</th>
    <th>Purpose</th>
  </tr>
  <tr>
    <td>API Framework</td>
    <td>FastAPI</td>
    <td>High-performance API with automatic documentation</td>
  </tr>
  <tr>
    <td>Database</td>
    <td>MongoDB (via Motor)</td>
    <td>Flexible document storage for logs and metrics</td>
  </tr>
  <tr>
    <td>AI Engine</td>
    <td>Google Gemini</td>
    <td>Advanced AI for log analysis and remediation</td>
  </tr>
  <tr>
    <td>Email Notifications</td>
    <td>SMTP via aiosmtplib</td>
    <td>Asynchronous email delivery for alerts</td>
  </tr>
  <tr>
    <td>Templates</td>
    <td>Jinja2</td>
    <td>Customizable email templates</td>
  </tr>
</table>

## 📂 Project Structure

```
WatchTowerAI/
├── Backend/
│   ├── app/
│   │   ├── main.py             # FastAPI application
│   │   ├── config.py           # Environment configurations
│   │   ├── database.py         # MongoDB connection & session
│   │   ├── models.py           # Data models (Pydantic)
│   │   ├── schemas.py          # Pydantic data validation schemas
│   │   └── services/           # Core application services
│   │       ├── gemini.py       # Gemini AI integration
│   │       ├── email_alert.py  # Email notifications (SMTP)
│   │       ├── log_processor.py # Log processing logic
│   │       ├── log_classifier.py # AI log classification
│   │       └── metrics.py      # Metrics tracking
│   ├── email_templates/        # Jinja2 email templates
│   └── .env.example            # Environment variables template
├── .gitignore                  # Git ignore file
└── README.md                   # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- MongoDB 4.4+
- Google Gemini API Key
- SMTP email server for alerts

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lohitkolluri/WatchTowerAI.git
cd WatchTowerAI
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file from the template:
```bash
cp Backend/.env.example Backend/.env
```

5. Configure your environment variables in `.env`:
```
MONGODB_URI=mongodb://localhost:27017/watchtower
GEMINI_API_KEY=your-gemini-api-key
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=username
SMTP_PASSWORD=password
EMAIL_FROM=alerts@yourdomain.com
ALERT_RECIPIENT=recipient@yourdomain.com
```

### Running the Application

Start the app with Uvicorn:
```bash
cd Backend
uvicorn app.main:app --reload
```

Access the interactive API documentation at:
```
http://localhost:8000/docs
```

## 📑 API Documentation

WatchTowerAI provides a comprehensive API for log ingestion, monitoring, and alerting:

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ingest` | POST | Ingest structured log entries |
| `/logs` | GET | Retrieve and filter logs |
| `/logs/search` | GET | Advanced search with classification filters |
| `/alerts` | GET | Retrieve and filter alerts |
| `/alerts/{alert_id}` | PATCH | Acknowledge alerts |
| `/metrics` | GET | Get service performance metrics |
| `/monitor/api` | POST | Register external API endpoints for monitoring |
| `/monitor/api` | GET | View API monitoring results |
| `/health` | GET | Simple health check endpoint |
| `/{path:path}` | ANY | Universal monitoring endpoint (captures any request) |

## 🔍 Intelligent Log Classification

WatchTowerAI automatically classifies logs with:

### Classification Categories

- **Primary log type**:
  - database, auth, request, performance, security, infrastructure

- **Subtype**:
  - connection_error, login_failure, query_issues, etc.

- **Entity extraction**:
  - IP addresses, emails, user IDs, request IDs, timestamps, URLs

- **Confidence scoring**:
  - How certain the classification is (0.0-1.0)

- **Auto-generated tags**:
  - Based on content, severity, and classification

This classification powers advanced search capabilities and better insights.

## 🌐 Universal Endpoint Monitoring

The system can monitor any API endpoint by:

1. Capturing requests to undefined paths with `/{path:path}`
2. Supporting all HTTP methods and content types
3. Extracting and storing full request details (headers, body, query params)
4. Automatically classifying and processing the captured requests
5. Generating alerts for unexpected behavior

Simply direct traffic to any undefined path on your WatchTowerAI server with a `service_name` query parameter.

## 📮 Alert Emails

Emails are sent using HTML templates and include:
- Service information
- Alert details
- AI-generated remediation suggestions

Example templates provided:
- `alert_email.html` - For critical alerts
- `notification_email.html` - For general notifications

## ⚙️ Configuration Options

WatchTowerAI can be configured through environment variables:

### Database Settings
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB_NAME` - Database name
- `ENABLE_FALLBACK_MODE` - Run without MongoDB for development

### AI Integration
- `GEMINI_API_KEY` - Google Gemini API key for AI analysis

### Email Settings
- `SMTP_SERVER` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USERNAME` - SMTP authentication username
- `SMTP_PASSWORD` - SMTP authentication password
- `EMAIL_FROM` - Sender email address
- `ALERT_RECIPIENT` - Recipient email address for alerts

## 💡 Future Improvements

- Machine learning-based classification enhancements
- Real-time dashboard with metrics visualization
- Webhook integrations for alerts (Slack, Discord, etc.)
- Enhanced anomaly detection with historical pattern analysis
- Dockerized deployment with Kubernetes support

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Developed by [Lohit Kolluri](https://github.com/lohitkolluri)
