# 🚨 WatchTowerAI

<div align="center">
  <h1>🚨 WatchTowerAI</h1>
  <p><strong>AI-powered API monitoring and alerting platform</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#frontend">Frontend</a> •
    <a href="#backend">Backend</a> •
    <a href="#api-documentation">API</a>
  </p>

  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python" alt="Python 3.10+"/>
  <img src="https://img.shields.io/badge/Framework-FastAPI-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat-square&logo=next.js" alt="Next.js 14"/>
  <img src="https://img.shields.io/badge/UI-Shadcn/ui-black?style=flat-square" alt="Shadcn/ui"/>
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=google" alt="Google Gemini AI"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License"/>
</div>

---

## 🌟 Overview

WatchTowerAI is a comprehensive API monitoring and alerting system that uses artificial intelligence to detect, classify, and predict anomalies in your services. It combines a modern Next.js frontend with a powerful FastAPI backend to provide real-time monitoring, intelligent log analysis, and automated remediation suggestions.

## 🚀 Features

### Frontend Features

#### Dashboard
- **Real-time Metrics Display**: Live service health monitoring
- **Interactive Charts**: Error rates, response times, and user activity
- **Active Alerts Panel**: Real-time alert notifications
- **Service Health Overview**: Status of all monitored services
- **Quick Actions**: Instant access to key functions

#### Endpoints Management
- **Visual Endpoint Explorer**: Browse and manage API endpoints
- **Health Status Indicators**: Real-time endpoint status
- **Configuration Interface**: Easy endpoint setup and modification
- **Performance Metrics**: Response time and error rate tracking
- **Filtering & Search**: Find endpoints by service, status, or name

#### Logs View
- **Advanced Log Explorer**: Search and filter log entries
- **AI-powered Analysis**: Intelligent log classification display
- **Real-time Log Streaming**: Live log updates
- **Context-aware Filtering**: Filter by severity, service, or time
- **Log Detail View**: In-depth analysis of individual logs

#### Services Dashboard
- **Service Overview**: Health and performance metrics
- **Resource Usage**: CPU, memory, and network statistics
- **Dependency Mapping**: Service relationship visualization
- **Alert Configuration**: Per-service alert settings
- **Historical Data**: Performance trends and patterns

#### Analytics
- **Custom Dashboards**: Build personalized metric views
- **Trend Analysis**: Historical performance patterns
- **Error Analysis**: Common error patterns and solutions
- **Service Comparisons**: Cross-service performance metrics
- **Export Capabilities**: Data export in multiple formats

#### Settings
- **Alert Configuration**: Customize alert thresholds and rules
- **Notification Setup**: Email and webhook configurations
- **User Management**: Access control and permissions
- **API Key Management**: Generate and manage API keys
- **Theme Customization**: Light/dark mode support

### Backend Features

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

### Frontend Architecture

```
Frontend/
├── src/
│   ├── app/                    # Next.js 14 app directory
│   │   ├── analytics/         # Analytics page and components
│   │   ├── endpoints/         # Endpoint management
│   │   ├── logs/             # Log viewer and analysis
│   │   ├── services/         # Service management
│   │   └── settings/         # Application settings
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Shadcn UI components
│   │   ├── charts/           # Chart components
│   │   └── shared/           # Shared components
│   ├── lib/                   # Utility functions
│   ├── hooks/                 # Custom React hooks
│   └── styles/                # Global styles
├── public/                    # Static assets
└── next.config.js            # Next.js configuration
```

### Backend Architecture

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

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

### Backend Setup

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
| `/api/endpoints` | GET | List all registered API endpoints |
| `/api/endpoints` | POST | Register a new API endpoint |
| `/api/endpoints/{endpoint_id}` | GET | Get a specific API endpoint |
| `/api/endpoints/{endpoint_id}` | PUT | Update an API endpoint |
| `/api/endpoints/{endpoint_id}` | DELETE | Delete an API endpoint |
| `/api/endpoints/{endpoint_id}/ping` | POST | Ping an endpoint and record results |
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

WatchTowerAI provides a complete endpoint lifecycle management:
- Register new endpoints via API or web interface
- View all registered endpoints with status information
- Update endpoint configuration as needed
- Delete endpoints that are no longer needed
- Automatic monitoring of registered endpoints
- Detailed history of endpoint performance

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

## 📱 Frontend Components

### Core Components

#### Dashboard Components
- `DashboardMetrics`: Real-time service metrics
- `AlertPanel`: Active alerts display
- `ServiceHealth`: Service status overview
- `ErrorRateChart`: Error rate visualization
- `ResponseTimeGraph`: Response time tracking

#### Endpoint Management
- `EndpointList`: Endpoint directory
- `EndpointForm`: Configuration interface
- `HealthIndicator`: Status display
- `MetricsDisplay`: Performance data
- `FilterBar`: Search and filtering

#### Log Analysis
- `LogViewer`: Main log display
- `LogFilter`: Advanced filtering
- `LogDetail`: Detailed log view
- `LiveStream`: Real-time updates
- `SearchBar`: Log search interface

#### Service Management
- `ServiceOverview`: Service details
- `ResourceMetrics`: Usage statistics
- `DependencyGraph`: Service mapping
- `AlertConfig`: Alert settings
- `HistoricalData`: Performance history

#### Analytics Tools
- `CustomDashboard`: Dashboard builder
- `TrendAnalyzer`: Pattern analysis
- `ErrorAnalytics`: Error tracking
- `ServiceComparator`: Comparison tools
- `ExportTools`: Data export

#### Settings Interface
- `AlertSettings`: Alert configuration
- `NotificationConfig`: Notification setup
- `UserManager`: User administration
- `APIKeyManager`: Key management
- `ThemeSelector`: Theme settings

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Dark/Light Modes**: Theme support
- **Accessible Components**: WCAG compliance
- **Interactive Charts**: Real-time data visualization
- **Intuitive Navigation**: User-friendly layout

## 📊 Data Flow

1. **Frontend to Backend**:
   - REST API calls for data retrieval
   - WebSocket connections for real-time updates
   - GraphQL queries for complex data requirements

2. **Backend Processing**:
   - Data validation and sanitization
   - AI-powered analysis
   - Event processing and alerting

3. **Data Storage**:
   - MongoDB for persistent storage
   - Redis for caching
   - Time-series data for metrics

## 🔒 Security Features

- **Authentication**: JWT-based auth
- **Authorization**: Role-based access control
- **API Security**: Rate limiting and CORS
- **Data Encryption**: In-transit and at-rest
- **Audit Logging**: Security event tracking

## 🧪 Testing

### Frontend Testing
- **Unit Tests**: Component testing with Jest
- **Integration Tests**: Page testing with React Testing Library
- **E2E Tests**: End-to-end testing with Cypress
- **Performance Tests**: Lighthouse and Web Vitals
- **Accessibility Tests**: axe-core integration

### Backend Testing
// ... existing testing content ...

## 📱 Responsive Design

The frontend is built with a mobile-first approach and supports:
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Touch-friendly interface for small screens
- **PWA Support**: Install as standalone app
- **Offline Capabilities**: Basic functionality without internet

## 🎨 Theme Customization

- **Color Schemes**: Light and dark mode support
- **Custom Branding**: Easy theme customization
- **Component Styling**: Consistent design system
- **Accessibility**: High contrast options
- **RTL Support**: Right-to-left language support

## 🔄 State Management

- **React Context**: App-wide state management
- **SWR**: Data fetching and caching
- **Local Storage**: Persistent user preferences
- **URL State**: Route-based state management
- **Form State**: Form handling with React Hook Form

## 📈 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Dynamic imports
- **Image Optimization**: Next.js Image component
- **Caching Strategy**: SWR caching
- **Bundle Size**: Webpack optimization
- **Lazy Loading**: Component lazy loading

### Backend Optimization
// ... existing optimization content ...

## 🌐 API Integration

### Frontend API Features
- **Axios Integration**: HTTP client setup
- **Request Interceptors**: Auth token handling
- **Response Handling**: Error management
- **Rate Limiting**: Request throttling
- **Retry Logic**: Failed request retry

### Backend API Features
// ... existing API features ...

## 📚 Documentation

### Frontend Documentation
- **Component Documentation**: Storybook integration
- **API Documentation**: OpenAPI/Swagger UI
- **Type Documentation**: TypeScript types
- **Usage Examples**: Code snippets
- **Style Guide**: Component usage guidelines

### Backend Documentation
// ... existing documentation content ...

## 🔧 Development Tools

### Frontend Tools
- **TypeScript**: Type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Commitlint**: Commit message linting

### Backend Tools
// ... existing tools content ...

## 🚀 Deployment

### Frontend Deployment
- **Vercel**: Production deployment
- **Docker**: Containerization
- **CI/CD**: GitHub Actions
- **Environment**: Environment variables
- **Analytics**: Deployment analytics

### Backend Deployment
// ... existing deployment content ...
