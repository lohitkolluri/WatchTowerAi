import { endpointService } from '@/services/endpointService';
import {
  Service,
  ServiceResponse,
  EndpointData,
  EndpointResponse,
  PaginatedResponse,
  FilterParams,
  ApiError,
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateEndpointRequest,
  ServiceMetrics
} from '@/types/common';

// API service for WatchTowerAI

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Error class for API errors
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response, type?: string): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorDetails;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.detail || errorMessage;
      errorDetails = errorData.details;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiRequestError(
      errorMessage,
      response.status,
      response.status.toString(),
      errorDetails
    );
  }

  if (type === 'void') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Helper function to build query string
function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// API endpoints
export const api = {
  // Logs endpoints
  logs: {
    getAll: async (params?: FilterParams): Promise<PaginatedResponse<any>> => {
      const queryString = buildQueryString(params);
      const response = await fetch(`${API_BASE_URL}/logs${queryString}`);
      return handleResponse<PaginatedResponse<any>>(response, 'json');
    },

    search: async (params?: FilterParams): Promise<PaginatedResponse<any>> => {
      const queryString = buildQueryString(params);
      const response = await fetch(`${API_BASE_URL}/logs/search${queryString}`);
      return handleResponse<PaginatedResponse<any>>(response, 'json');
    },

    ingest: async (logData: any): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });
      return handleResponse<void>(response, 'void');
    },
  },

  // Alerts endpoints
  alerts: {
    getAll: async (params?: FilterParams): Promise<PaginatedResponse<any>> => {
      const queryString = buildQueryString(params);
      const response = await fetch(`${API_BASE_URL}/alerts${queryString}`);
      return handleResponse<PaginatedResponse<any>>(response, 'json');
    },

    acknowledge: async (alertId: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acknowledged: true }),
      });
      return handleResponse<void>(response, 'void');
    },
  },

  // Metrics endpoints
  metrics: {
    getAll: async (params?: FilterParams): Promise<ServiceMetrics[]> => {
      const queryString = buildQueryString(params);
      const response = await fetch(`${API_BASE_URL}/metrics${queryString}`);
      return handleResponse<ServiceMetrics[]>(response, 'json');
    },
  },

  // Endpoints monitoring
  endpoints: {
    getAll: async (): Promise<EndpointData[]> => {
      return endpointService.getAllEndpoints();
    },

    getById: async (id: string): Promise<EndpointResponse> => {
      return endpointService.getEndpointById(id);
    },

    create: async (data: CreateEndpointRequest): Promise<EndpointResponse> => {
      return endpointService.createEndpoint(data);
    },

    update: async (id: string, data: Partial<EndpointData>): Promise<EndpointResponse> => {
      return endpointService.updateEndpoint(id, data);
    },

    delete: async (id: string): Promise<void> => {
      return endpointService.deleteEndpoint(id);
    },

    ping: async (id: string): Promise<void> => {
      return endpointService.pingEndpoint(id);
    },
  },

  // Services endpoints
  services: {
    getAll: async (params?: FilterParams): Promise<Service[]> => {
      try {
        const queryString = buildQueryString(params);
        const response = await fetch(`${API_BASE_URL}/services${queryString}`);
        const data = await handleResponse<any>(response, 'json');

        // Also fetch metrics to combine with service data
        const metricsResponse = await fetch(`${API_BASE_URL}/metrics`);
        const metricsData = await handleResponse<any>(metricsResponse, 'json');

        // Create a map of service metrics
        const metricsMap = new Map<string, ServiceMetrics>();
        const metrics = Array.isArray(metricsData) ? metricsData : metricsData?.metrics || [];

        metrics.forEach((metric: any) => {
          if (!metric.service_name) {
            console.warn('Metric missing service_name:', metric);
            return;
          }

          metricsMap.set(metric.service_name, {
            uptime: metric.total_requests > 0 ? 100 - (metric.errors / metric.total_requests * 100) : 100,
            errorRate: metric.total_requests > 0 ? (metric.errors / metric.total_requests * 100) : 0,
            totalRequests: metric.total_requests || 0,
            errors: metric.errors || 0,
            responseTime: metric.response_time || metric.avg_response_time || 0,
            lastUpdated: metric.last_updated || metric.updated_at || new Date().toISOString()
          });
        });

        // Combine service data with metrics
        const services = Array.isArray(data) ? data : data?.services || [];
        return services.map((service: any) => ({
          id: service._id || service.id,
          name: service.name,
          environment: service.environment,
          alertRules: service.alertRules,
          notificationChannels: service.notificationChannels || [],
          status: service.status === "Active" ? "healthy" :
                 service.status === "Disabled" ? "critical" :
                 service.status || "healthy",
          endpoint: service.endpoint ? {
            url: service.endpoint.url,
            method: service.endpoint.method,
            headers: service.endpoint.headers || {},
            timeout: service.endpoint.timeout || 5000,
            lastChecked: service.endpoint.last_checked,
            healthStatus: service.endpoint.health_status
          } : undefined,
          metrics: metricsMap.get(service.name) || null
        }));
      } catch (error) {
        console.error('Error fetching services:', error);
        throw error instanceof ApiRequestError ? error : new ApiRequestError(
          'Failed to fetch services',
          500,
          'FETCH_SERVICES_ERROR'
        );
      }
    },

    getById: async (id: string): Promise<ServiceResponse> => {
      try {
        const response = await fetch(`${API_BASE_URL}/services/${id}`);
        const service = await handleResponse<any>(response, 'json');

        // Fetch metrics for this service
        const metricsResponse = await fetch(`${API_BASE_URL}/metrics?service=${service.name}`);
        const metricsData = await handleResponse<any>(metricsResponse, 'json');
        const metric = Array.isArray(metricsData) ? metricsData[0] : metricsData;

        const metrics: ServiceMetrics = {
          uptime: metric?.total_requests > 0 ? 100 - (metric.errors / metric.total_requests * 100) : 100,
          errorRate: metric?.total_requests > 0 ? (metric.errors / metric.total_requests * 100) : 0,
          totalRequests: metric?.total_requests || 0,
          errors: metric?.errors || 0,
          responseTime: metric?.response_time || metric?.avg_response_time || 0,
          lastUpdated: metric?.last_updated || metric?.updated_at || new Date().toISOString()
        };

        return {
          service: {
            id: service._id || service.id,
            name: service.name,
            environment: service.environment,
            alertRules: service.alertRules,
            notificationChannels: service.notificationChannels || [],
            status: service.status,
            endpoint: service.endpoint ? {
              url: service.endpoint.url,
              method: service.endpoint.method,
              headers: service.endpoint.headers || {},
              timeout: service.endpoint.timeout || 5000,
              lastChecked: service.endpoint.last_checked,
              healthStatus: service.endpoint.health_status
            } : undefined,
            metrics
          },
          health: {
            status: service.status === "Active" ? "healthy" :
                   service.status === "Disabled" ? "critical" : "degraded",
            lastCheck: service.last_checked || new Date().toISOString(),
            message: service.status_message,
            metrics
          }
        };
      } catch (error) {
        console.error(`Error fetching service ${id}:`, error);
        throw error instanceof ApiRequestError ? error : new ApiRequestError(
          'Failed to fetch service',
          500,
          'FETCH_SERVICE_ERROR'
        );
      }
    },

    create: async (serviceData: CreateServiceRequest): Promise<ServiceResponse> => {
      try {
        const response = await fetch(`${API_BASE_URL}/services`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serviceData),
        });
        return handleResponse<ServiceResponse>(response, 'json');
      } catch (error) {
        console.error('Error creating service:', error);
        throw error instanceof ApiRequestError ? error : new ApiRequestError(
          'Failed to create service',
          500,
          'CREATE_SERVICE_ERROR'
        );
      }
    },

    update: async (id: string, serviceData: UpdateServiceRequest): Promise<ServiceResponse> => {
      try {
        const response = await fetch(`${API_BASE_URL}/services/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serviceData),
        });
        return handleResponse<ServiceResponse>(response, 'json');
      } catch (error) {
        console.error(`Error updating service ${id}:`, error);
        throw error instanceof ApiRequestError ? error : new ApiRequestError(
          'Failed to update service',
          500,
          'UPDATE_SERVICE_ERROR'
        );
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/services/${id}`, {
          method: 'DELETE',
        });
        return handleResponse<void>(response, 'void');
      } catch (error) {
        console.error(`Error deleting service ${id}:`, error);
        throw error instanceof ApiRequestError ? error : new ApiRequestError(
          'Failed to delete service',
          500,
          'DELETE_SERVICE_ERROR'
        );
      }
    },
  },

  // Settings endpoints
  settings: {
    getSMTP: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/settings/smtp`);
      return handleResponse<any>(response, 'json');
    },

    updateSMTP: async (smtpConfig: any): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/settings/smtp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(smtpConfig),
      });
      return handleResponse<void>(response, 'void');
    },
  },

  // Health check
  health: async (): Promise<{ status: string; version: string; }> => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{ status: string; version: string; }>(response, 'json');
  },
};
