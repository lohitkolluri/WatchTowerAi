# 🚨 WatchTowerAI - Enterprise AI-Powered API Monitoring Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-Red?style=for-the-badge)
![Production Ready](https://img.shields.io/badge/Production%20Ready-Yes-green?style=for-the-badge)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code Style: ESLint](https://img.shields.io/badge/code%20style-ESLint-4B32C3.svg)](https://eslint.org/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/tsconfig#strict)

**Enterprise-grade API monitoring with AI-powered anomaly detection and intelligent alerting.**

[📖 Documentation](#-documentation) • [🚀 Quick Start](#-quick-start) • [📡 API Reference](#-api-reference) • [🛠️ Deployment](#-deployment) • [💬 Support](#-support)

</div>

---

## 📖 Overview

WatchTowerAI is a comprehensive, production-ready AI-powered API monitoring and alerting platform that combines a modern Next.js frontend with a robust FastAPI backend. The platform provides real-time monitoring, anomaly detection, and intelligent alerting for API endpoints, powered by Google's Gemini AI for advanced analysis and remediation suggestions.

**Perfect for:**
- 🏢 Enterprise monitoring at scale
- 🔍 Comprehensive API observability
- 🤖 AI-powered anomaly detection
- 📊 Real-time performance analytics
- 🚨 Intelligent alerting with recommendations

---

## 🌟 Key Features

### Core Capabilities
- **Universal API Monitoring**: Monitor any API endpoint with real-time performance tracking
- **AI-Powered Analysis**: Gemini AI integration for intelligent log analysis and anomaly detection
- **Real-time Alerting**: Instant notifications with actionable AI-generated suggestions
- **Advanced Log Management**: Powerful search and filtering with 90+ day retention
- **Email Notifications**: Structured, formatted alerts with remediation steps
- **Comprehensive Metrics**: Real-time and historical performance analytics

### Enterprise Features
- ✅ Rate limiting and DDoS protection
- ✅ Multi-environment support (dev, staging, production)
- ✅ Configurable data retention policies
- ✅ Role-based access control ready
- ✅ Comprehensive audit logging
- ✅ Sentry integration for error tracking
- ✅ Prometheus metrics export
- ✅ Health checks and uptime monitoring
- ✅ Background job processing
- ✅ Distributed caching with Redis

### Security
- ✅ API key authentication with rotation
- ✅ OAuth2 token-based authentication
- ✅ Input validation and sanitization
- ✅ CORS protection with configurable origins
- ✅ Rate limiting (100 req/min default)
- ✅ Secure headers
- ✅ Secret management ready
- ✅ Environment-based configuration

---

## 🔧 Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS with custom components
- **State Management**: React Query v5
- **UI Components**: Radix UI + Shadcn/ui
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Animations**: Framer Motion

### Backend
- **Framework**: FastAPI 0.109.0
- **Database**: MongoDB with Motor (AsyncIO)
- **AI Integration**: Google Gemini API with structured prompting
- **Email Service**: SMTP via aiosmtplib with Jinja2 templates
- **Logging**: Loguru with JSON output
- **Data Validation**: Pydantic v2
- **Caching**: Redis support
- **Monitoring**: Sentry, Prometheus metrics

### DevOps
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose, Kubernetes ready
- **Load Balancing**: Nginx config provided
- **CI/CD**: GitHub Actions ready

---

## 📂 Project Structure

### Directory Layout
```plaintext
WatchTowerAi/
├── Backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── gemini.py           # Gemini AI + structured prompting
│   │   │   ├── log_classifier.py   # Advanced classification engine
│   │   │   ├── log_processor.py    # Async log processing
│   │   │   └── email_alert.py      # Email notification service
│   │   ├── config.py               # Enterprise config management
│   │   ├── database.py             # MongoDB async driver
│   │   ├── main.py                 # FastAPI app with middleware
│   │   ├── models.py               # Database models
│   │   └── schemas.py              # Pydantic validation schemas
│   ├── email_templates/            # Jinja2 templates
│   ├── logs/                       # Application logs
│   ├── Dockerfile                  # Multi-stage build
│   ├── requirements.txt            # 20+ production dependencies
│   └── .env.example                # Comprehensive config template
├── Frontend/
│   ├── src/
│   │   ├── app/                    # Next.js pages
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── alerts/             # Alert management
│   │   │   ├── logs/               # Log viewer
│   │   │   ├── analytics/          # Performance analytics
│   │   │   ├── endpoints/          # API management
│   │   │   ├── services/           # Service management
│   │   │   └── settings/           # Configuration
│   │   ├── components/
│   │   │   ├── layouts/            # Layout system
│   │   │   ├── ui/                 # Radix UI components
│   │   │   └── endpoints/          # Domain components
│   │   ├── lib/
│   │   │   ├── api.ts              # Typed API client
│   │   │   └── utils.ts            # Helper functions
│   │   └── types/                  # TypeScript types
│   ├── Dockerfile.prod             # Production-optimized
│   ├── next.config.js              # Optimization config
│   └── tailwind.config.js          # Design system
├── docker-compose.yml              # Full-stack setup
├── PRODUCTION_DEPLOYMENT.md        # Deployment guide (NEW!)
└── README.md                       # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/bun
- Python 3.9+
- MongoDB (local or Atlas)
- Google Gemini API key (free tier available)
- (Optional) Docker and Docker Compose

### 5-Minute Setup

**1. Clone and install:**
```bash
git clone https://github.com/lohitkolluri/WatchTowerAi
cd WatchTowerAi

# Backend setup
cd Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Frontend setup
cd ../Frontend
npm install
```

**2. Configure environment (Backend/.env):**
```env
ENVIRONMENT=development
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=watchtower
GEMINI_API_KEY=your_gemini_key_here
DEBUG=true
LOG_LEVEL=DEBUG
```

**3. Start services:**
```bash
# Terminal 1 - Backend (from Backend directory)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend (from Frontend directory)
npm run dev
```

**4. Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Docker Setup (One Command)
```bash
docker-compose up -d
# Wait for services to start (~30 seconds)
# Access: http://localhost:3000 (frontend) | http://localhost:8000 (backend)
```

---

## 📡 API Documentation

### Core Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/ingest` | Log ingestion | Optional |
| `GET` | `/logs` | Retrieve logs with filtering | Optional |
| `GET` | `/logs/search` | Advanced log search | Optional |
| `GET` | `/alerts` | Get alerts | OAuth2 |
| `PATCH` | `/alerts/{id}` | Update alert status | OAuth2 |
| `GET` | `/metrics` | Service metrics | API Key |
| `POST` | `/monitor/api` | Monitor external API | Optional |
| `GET` | `/monitor/api` | API monitoring results | Optional |
| `GET` | `/health` | Health check | None |

### Authentication

```bash
# API Key Method
curl -H "X-API-Key: your_api_key" http://localhost:8000/metrics

# OAuth2 Token Method
curl -H "Authorization: Bearer your_token" http://localhost:8000/alerts
```

### Example Request

```bash
# Ingest a log entry
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "payment-service",
    "environment": "production",
    "level": "ERROR",
    "message": "Payment gateway timeout after 30s",
    "error_code": "ERR_TIMEOUT",
    "correlation_id": "req-12345"
  }'
```

**See** [`Backend/README.md`](Backend/README.md) for detailed API reference.

---

## 🛠️ Deployment

### Local Development
```bash
# Run development server with auto-reload
cd Backend && uvicorn app.main:app --reload
```

### Docker Compose (Recommended for testing)
```bash
docker-compose up -d
docker-compose logs -f backend  # View logs
docker-compose down  # Stop services
```

### Production Deployment

**See complete guide:** [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md)

Quick checklist:
- [ ] Configure production `.env` with strong secrets
- [ ] Set `ENVIRONMENT=production` and `DEBUG=false`
- [ ] Update CORS origins to your domain
- [ ] Configure MongoDB Atlas cluster
- [ ] Set up Redis for caching
- [ ] Configure SMTP for email alerts
- [ ] Enable monitoring (Sentry, Prometheus)
- [ ] Set up SSL/TLS certificates
- [ ] Configure load balancing (Nginx/HAProxy)
- [ ] Run security audit

**Deploy with:**
```bash
# Docker Compose
docker-compose -f docker-compose.yml up -d

# Kubernetes
helm install watchtowerai ./helm/watchtowerai -f values-prod.yaml

# Traditional VPS
# See PRODUCTION_DEPLOYMENT.md for step-by-step
```

---

## 🎯 Key Capabilities

### AI-Powered Monitoring
- **Hybrid Classification**: Pattern matching + Gemini AI analysis
- **Structured Prompting**: Few-shot examples, decision trees
- **Entity Extraction**: IP addresses, emails, error codes, URLs
- **Confidence Scoring**: 0-1 reliability metrics for classifications
- **Fallback Handling**: Graceful degradation when AI unavailable

### Dashboard Features
- Real-time metrics with 5-second refresh
- Interactive log viewer with 100+ filters
- Alert management with acknowledgment workflow
- Performance trend analysis and forecasting
- Customizable dashboards

### Alert System
- **Configurable Triggers**: Threshold-based or pattern-based
- **AI Remediation**: Automatic fix suggestions
- **Multi-Channel**: Email with HTML templates
- **Smart Grouping**: Related alerts deduplicated
- **Escalation**: Automatic escalation for critical issues

---

## 📊 Performance

### Target Metrics
- **Response Time (p95)**: <500ms
- **DB Query Time (p95)**: <100ms
- **Log Ingestion Rate**: 1000+ logs/sec
- **Uptime**: 99.9%
- **Error Rate**: <0.1%

### Optimization Features
- Asynchronous processing with background tasks
- Redis caching layer
- MongoDB connection pooling
- Gzip compression
- Query optimization
- Batch processing

---

## 🛡️ Security

### Built-in Security Features
- ✅ API key authentication with rotation support
- ✅ OAuth2 Bearer token authentication
- ✅ Rate limiting (configurable, default 100 req/60s)
- ✅ CORS protection with specific origin whitelist
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF tokens support
- ✅ Secure password hashing
- ✅ TLS/SSL ready

### Security Checklist
- [ ] Generate strong secrets (API_KEY, AUTH_TOKEN, SECRET_KEY)
- [ ] Store secrets in AWS Secrets Manager or HashiCorp Vault
- [ ] Enable IP whitelisting for database
- [ ] Use MongoDB Atlas with authentication
- [ ] Enable HTTPS/TLS on all endpoints
- [ ] Configure WAF rules
- [ ] Enable audit logging
- [ ] Rotate secrets regularly
- [ ] Enable rate limiting
- [ ] Monitor for suspicious activity

---

## 📚 Documentation

- **[Backend Documentation](Backend/README.md)** - Detailed API reference
- **[Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)** - Complete deployment instructions
- **[Configuration Guide](Backend/.env.example)** - All configuration options explained
- **[API Swagger UI](http://localhost:8000/docs)** - Interactive API explorer

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**MIT License Summary:**
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ❌ Liability
- ❌ Warranty

---

## 💬 Support

- **Email**: [me@lohit.is-a.dev](mailto:me@lohit.is-a.dev)
- **GitHub Issues**: [Report bugs or request features](https://github.com/lohitkolluri/WatchTowerAi/issues)
- **Documentation**: [Full documentation](Backend/README.md)
- **Deployment Help**: [Production deployment guide](PRODUCTION_DEPLOYMENT.md)

---

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [Next.js](https://nextjs.org/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Database by [MongoDB](https://www.mongodb.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styled with [TailwindCSS](https://tailwindcss.com/)

---

<div align="center">

**⭐ If you find this project helpful, please give it a star!**

Made with ❤️ by [Lohit Kolluri](https://lohit.is-a.dev)

Last Updated: October 2025 | Version: 1.0.0

</div>
