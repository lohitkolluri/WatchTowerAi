# 🚨 WatchTowerAI Backend

**AI-powered API monitoring and alerting backend for detecting and predicting anomalies, built with FastAPI, MongoDB, and Google Gemini AI.**

---

## 🌟 Features
- **Universal API Monitoring** - Monitor any endpoint with any data structure automatically
- **AI-powered Classification** - Intelligent log categorization and entity extraction
- **Advanced Search** - Find logs by type, entities, confidence scores, and more
- **Real-time Anomaly Detection** - With Google Gemini AI integration
- **Smart Alerting** - Automated alert generation with remediation suggestions
- **Email Notifications** - For critical issues using templated emails
- **Flexible Data Storage** - MongoDB for scalable and schema-flexible storage
- **Comprehensive API** - Endpoints for logs, alerts, metrics, and monitoring

---

## 🛠️ Tech Stack

| Component             | Technology                   |
|-----------------------|------------------------------|
| Web Framework         | FastAPI                      |
| Database              | MongoDB (Motor)              |
| AI Analysis           | Google Gemini (GenerativeAI) |
| Email Notifications   | SMTP (`aiosmtplib`)          |
| Templates             | Jinja2                       |

---

## 📂 Project Structure

```
WatchTowerAI/
├── app/
│   ├── main.py             # FastAPI application
│   ├── config.py           # Environment configurations
│   ├── database.py         # MongoDB connection & session
│   ├── models.py           # Data models (Pydantic)
│   ├── schemas.py          # Pydantic data validation schemas
│   └── services/           # Core application services
│       ├── gemini.py       # Gemini AI integration
│       ├── email_alert.py  # Email notifications (SMTP)
│       ├── log_processor.py # Log processing logic
│       ├── log_classifier.py # AI log classification
│       └── metrics.py      # Metrics tracking
├── email_templates/        # Jinja2 email templates
├── .env                    # Environment variables
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- MongoDB
- Google Gemini API Key
- SMTP email server

### Installation

Clone the repository:
```bash
git clone https://github.com/lohitkolluri/WatchTowerAI.git
cd WatchTowerAI
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Configure environment variables in `.env`:
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
uvicorn app.main:app --reload
```

---

## 📑 API Documentation

Access the interactive API docs (Swagger UI) at:

http://localhost:8000/docs

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /ingest` | Ingest structured log entries |
| `GET /logs` | Retrieve and filter logs |
| `GET /logs/search` | Advanced search with classification filters |
| `GET /alerts` | Retrieve and filter alerts |
| `PATCH /alerts/{alert_id}` | Acknowledge alerts |
| `GET /metrics` | Get service performance metrics |
| `POST /monitor/api` | Register external API endpoints for monitoring |
| `GET /monitor/api` | View API monitoring results |
| `/{path:path}` | Universal monitoring endpoint (captures any request) |

---

## 🔍 Intelligent Log Classification

WatchTowerAI automatically classifies logs with:

- **Primary log type**: database, auth, request, performance, security, infrastructure
- **Subtype**: connection errors, login failures, query issues, etc.
- **Entity extraction**: IP addresses, emails, user IDs, request IDs, timestamps, URLs
- **Confidence scoring**: How certain the classification is
- **Auto-generated tags**: Based on content, severity, and classification

This classification powers advanced search capabilities and better insights.

---

## 🌐 Universal Endpoint Monitoring

The system can monitor any API endpoint by:

1. Capturing requests to undefined paths with `/{path:path}`
2. Supporting all HTTP methods and content types
3. Extracting and storing full request details (headers, body, query params)
4. Automatically classifying and processing the captured requests
5. Generating alerts for unexpected behavior

Simply direct traffic to any undefined path on your WatchTowerAI server with a `service_name` query parameter.

---

## 📝 Logs & Monitoring

All application logs are stored in both:
- `logs/watchtower.log` (local logging)
- MongoDB collections (for data analysis)

---

## 📮 Alert Emails

Emails are sent using HTML templates (`email_templates/*.html`) and include:
- Service information
- Alert details
- AI-generated remediation suggestions

---

## 💡 Future Improvements
- Machine learning-based classification enhancements
- Real-time dashboard with metrics visualization
- Webhook integrations for alerts (Slack, Discord, etc.)
- Enhanced anomaly detection with historical pattern analysis
- Dockerized deployment with Kubernetes support

---

## 🛡️ License

MIT License
