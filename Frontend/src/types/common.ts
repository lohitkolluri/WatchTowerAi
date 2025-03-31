export interface Service {
  id: string;
  name: string;
  environment: string;
  alertRules: string;
  notificationChannels: string[];
  status: "Active" | "Pending" | "Disabled";
  endpoint?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    timeout: number;
    lastChecked?: Date;
    healthStatus?: string;
  };
  metrics?: ServiceMetrics;
}

export interface ServiceMetrics {
  uptime: number;
  errorRate: number;
  totalRequests: number;
  errors: number;
  responseTime: number;
  lastUpdated: string;
}

export interface EndpointData {
  _id: string;
  name: string;
  url: string;
  method: string;
  service?: string;
  description?: string;
  status: "active" | "inactive";
  environment?: string;
  headers?: Record<string, string>;
  timeout?: number;
  created_at: string;
  last_checked?: string;
  updated_at?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  notificationChannels: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: "email";
  config: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface FilterParams {
  search?: string;
  environment?: string;
  status?: string;
  service?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  log_type?: string;
  log_subtype?: string;
  confidence_min?: number;
  timeRange?: string;
}

export interface MetricsTimeRange {
  start: string;
  end: string;
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'critical';
  lastCheck: string;
  message?: string;
  metrics: ServiceMetrics;
}

export interface Alert {
  _id: string;
  message: string;
  service_name: string;
  environment: string;
  severity: string;
  status: string;
  timestamp: string;
  acknowledged: boolean;
  description?: string;
  remediation?: string;
}

export interface FormattedAlert {
  id: string;
  title: string;
  service: string;
  environment: string;
  severity: string;
  status: string;
  timestamp: Date;
  acknowledged: boolean;
  description?: string;
  remediation?: string;
}

export interface Metric {
  service_name: string;
  environment: string;
  total_requests?: number;
  errors?: number;
  total?: number;
  log_types?: Record<string, number>;
  log_subtypes?: Record<string, Record<string, number>>;
  updated_at?: string;
  last_updated?: string;
  response_time?: number;
  avg_response_time?: number;
}

export interface ErrorRateDataPoint {
  time: string;
  errorRate: number;
  timestamp: string;
}

export interface ServiceResponse {
  service: Service;
  health: ServiceHealth;
}

export interface EndpointResponse {
  endpoint: EndpointData;
  lastCheck?: {
    timestamp: string;
    status: number;
    responseTime: number;
    error?: string;
  };
}

export interface CreateServiceRequest {
  name: string;
  environment: string;
  alertRules: string;
  notificationChannels: string[];
  endpoint?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  status?: "Active" | "Pending" | "Disabled";
}

export interface CreateEndpointRequest {
  name: string;
  url: string;
  method: string;
  service?: string;
  description?: string;
  environment?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface Log {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, any> | null;
  raw_payload?: Record<string, any> | null;
}

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
