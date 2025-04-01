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

- Python 3.11+
- Node.js 18+
- MongoDB (local or cloud instance)
- Git

### Setup and Run

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/WatchTowerAi.git
cd WatchTowerAi
```

#### 2. Backend Setup

```bash
# Navigate to Backend directory
cd Backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at http://localhost:8000, with Swagger documentation at http://localhost:8000/docs.

#### 3. Frontend Setup

```bash
# In a new terminal, navigate to Frontend directory
cd Frontend

# Install dependencies
npm install
# or if you prefer yarn
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

The frontend application will be available at http://localhost:3000.

## API Endpoints

The backend exposes the following key endpoints:

- **GET /logs**: Get all logs
- **POST /ingest**: Ingest new logs
- **GET /alerts**: Get all alerts (requires token authentication)
- **GET /metrics**: Get service metrics (requires API key)
- **GET /api/endpoints**: List all registered API endpoints
- **POST /api/endpoints**: Register a new API endpoint
- **GET /health**: Check system health

For more detailed API documentation, visit http://localhost:8000/docs when the backend is running.

## Authentication

The application uses two types of authentication:

1. **API Key**: Used for metrics endpoint (X-API-Key header)
2. **Bearer Token**: Used for alerts endpoint (Authorization header)

You can configure the authentication tokens in the environment files:

### Backend
In `.env` and `.env.production`:
```
# Authentication
API_KEY=your_api_key_here
AUTH_TOKEN=your_auth_token_here
```

### Frontend
In `.env.development` and `.env.production`:
```
# Authentication
NEXT_PUBLIC_API_KEY=your_api_key_here
NEXT_PUBLIC_AUTH_TOKEN=your_auth_token_here
```

For testing purposes, the default values are:
- API Key: `test_api_key`
- Bearer Token: `demo_token_test`

## Configuration

Both backend and frontend have their own configuration files:

### Backend

Configuration is done through `.env` files:
- `.env` for development
- `.env.production` for production

### Frontend

Configuration is done through `.env` files:
- `.env.development` for development
- `.env.production` for production

The most important configuration is `NEXT_PUBLIC_API_URL` which should point to your backend server.

## License

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
