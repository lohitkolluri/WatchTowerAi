# 🚨 WatchTowerAI Backend

**AI-powered API monitoring and alerting backend for detecting and predicting anomalies, built with FastAPI, MongoDB, and Google Gemini AI.**

---

## 🌟 Features
- Real-time log ingestion via REST API
- Automated anomaly detection with Google Gemini
- Email alerts using SMTP with templated emails
- MongoDB for scalable document storage
- Professional structured logging for observability
- Easily extendable and maintainable codebase

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

---

## 🧪 Testing and Benchmarking

Generate fake logs to test backend functionality:
```bash
python generate_fake_logs.py --logs 100 --threads 5
```

---

## 📝 Logs & Monitoring

All application logs are stored in `logs/watchtower.log`.

---

## 📮 Alert Emails

Emails are sent using HTML templates (`email_templates/*.html`).

---

## 💡 Future Improvements
- Implement Celery/RQ for robust background task handling
- Transition to PostgreSQL for enhanced scalability
- Add structured logging for better analytics
- Dockerize for simplified deployment and scalability

---

## 🛡️ License

MIT License
