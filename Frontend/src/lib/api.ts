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
  ServiceMetrics,
  Log
} from '@/types/common';

// API service for WatchTowerAI

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Log the API configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    baseUrl: API_BASE_URL,
    environment: process.env.NODE_ENV
  });
}

if (!API_BASE_URL) {
  console.error('API_BASE_URL is not configured. Please check your environment variables.');
}

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
  try {
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData
      });

      // Special handling for CORS errors
      if (response.status === 0 || response.type === 'opaque') {
        throw new ApiRequestError(
          'Unable to connect to the API. This may be due to a CORS issue or the API being unavailable.',
          0,
          'CORS_ERROR'
        );
      }

      throw new ApiRequestError(
        errorData?.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData?.code || 'API_ERROR',
        errorData
      );
    }

    if (type === 'void') {
      return undefined as T;
    }

    try {
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      throw new ApiRequestError(
        'Invalid JSON response from server',
        500,
        'INVALID_JSON_RESPONSE'
      );
    }
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    console.error('Network or parsing error:', error);

    // Check if it's a CORS error
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiRequestError(
        'Unable to connect to the API. Please check if the API server is running and accessible.',
        0,
        'CONNECTION_ERROR'
      );
    }

    throw new ApiRequestError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'NETWORK_ERROR'
    );
  }
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

// Helper function to get auth headers
const getAuthHeaders = (requireAuth: boolean = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key - try both localStorage methods to improve compatibility
  let apiKey;

  if (typeof window !== 'undefined') {
    // Try both potential localStorage keys to be safe
    apiKey = window.localStorage.getItem('NEXT_PUBLIC_API_KEY') ||
             window.localStorage.getItem('api_key');

    console.log('API Key from localStorage:', apiKey ? 'Found key' : 'No key in localStorage');
  }

  // Fallback to environment variable or default from .env
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_API_KEY || 'test_api_key';
    console.log('Using fallback API Key from env or default');
  }

  // Ensure API key is properly set
  headers['X-API-Key'] = apiKey;

  // Add OAuth token if authentication is required
  if (requireAuth) {
    let token;

    if (typeof window !== 'undefined') {
      token = window.localStorage.getItem('auth_token');
      console.log('Auth token from localStorage:', token ? 'Found token' : 'No token in localStorage');
    }

    // Fallback to default if not in localStorage
    if (!token) {
      token = process.env.NEXT_PUBLIC_AUTH_TOKEN || 'demo_token_test';
      console.log('Using fallback auth token from env or default');
    }

    // Ensure token is formatted correctly
    if (token && !token.startsWith('Bearer ')) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (token) {
      headers['Authorization'] = token;
    }
  }

  // Debug: Log headers being sent (with sensitive parts redacted)
  console.log('API Headers:', {
    'Content-Type': headers['Content-Type'],
    'X-API-Key': headers['X-API-Key'] ? '**present**' : '**missing**',
    'Authorization': headers['Authorization'] ? '**present**' : '**missing**',
  });

  return headers;
};

// Helper function to validate API URL
const validateApiUrl = () => {
  if (!API_BASE_URL) {
    throw new ApiRequestError(
      'API URL is not configured',
      500,
      'API_CONFIG_ERROR'
    );
  }
};

// API endpoints
export const api = {
  // Logs endpoints
  logs: {
    getAll: async (params?: FilterParams): Promise<PaginatedResponse<Log>> => {
      try {
        validateApiUrl();

        // Clean and encode parameters, particularly the search term
        const cleanParams = { ...params };
        if (cleanParams.search) {
          cleanParams.search = cleanParams.search.trim();
          console.log(`API: Searching logs with term: "${cleanParams.search}"`);
        }

        const queryString = buildQueryString(cleanParams);
        console.log(`API: Fetching logs from: ${API_BASE_URL}/logs${queryString}`);

        const response = await fetch(`${API_BASE_URL}/logs${queryString}`, {
          headers: {
            ...getAuthHeaders(),
          },
          mode: 'cors',
          credentials: 'include'
        });

        const data = await handleResponse<any>(response, 'json');

        // Log the response data structure for debugging
        console.debug('Logs response structure:', {
          isArray: Array.isArray(data),
          hasLogsProperty: data?.logs !== undefined,
          hasDataProperty: data?.data !== undefined,
          totalCount: data?.total || (Array.isArray(data?.logs) ? data.logs.length : 0)
        });

        // Format the response to a consistent structure
        const formattedResponse: PaginatedResponse<Log> = {
          data: Array.isArray(data) ? data :
                Array.isArray(data?.logs) ? data.logs :
                Array.isArray(data?.data) ? data.data : [],
          total: data?.total || (Array.isArray(data) ? data.length :
                 Array.isArray(data?.logs) ? data.logs.length :
                 Array.isArray(data?.data) ? data.data.length : 0),
          page: data?.page || 1,
          pageSize: data?.pageSize || (data?.limit || 50),
          totalPages: data?.totalPages || Math.ceil((data?.total || 0) / (data?.limit || 50))
        };

        return formattedResponse;
      } catch (error) {
        console.error('Error fetching logs:', error);
        // Return empty data structure on error
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 0,
          totalPages: 0
        };
      }
    },

    search: async (params?: FilterParams & {
      log_type?: string;
      log_subtype?: string;
      tag?: string;
      entity_type?: string;
      entity_value?: string;
      confidence_min?: number;
    }): Promise<PaginatedResponse<Log>> => {
      // Maximum retry attempts for search
      const MAX_RETRY = 2;
      let retryCount = 0;

      // Implement retry logic for search
      const attemptSearch = async (): Promise<PaginatedResponse<Log>> => {
        try {
          validateApiUrl();

          // Clean and encode search parameters
          const cleanParams = { ...params };
          if (cleanParams.search) {
            cleanParams.search = cleanParams.search.trim();
            console.log(`API: Searching logs with term: "${cleanParams.search}"`);
          }

          const queryString = buildQueryString(cleanParams);
          console.log(`API: Searching logs at: ${API_BASE_URL}/logs/search${queryString}`);

          const response = await fetch(`${API_BASE_URL}/logs/search${queryString}`, {
            headers: {
              ...getAuthHeaders(),
            },
            mode: 'cors',
            credentials: 'include'
          });

          // Check if the response status indicates a server error (5xx)
          if (response.status >= 500 && retryCount < MAX_RETRY) {
            retryCount++;
            console.warn(`Server error while searching logs. Retrying (${retryCount}/${MAX_RETRY})...`);
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            return attemptSearch();
          }

          const data = await handleResponse<any>(response, 'json');

          // Format the response to a consistent structure
          const formattedResponse: PaginatedResponse<Log> = {
            data: Array.isArray(data) ? data :
                  Array.isArray(data?.logs) ? data.logs :
                  Array.isArray(data?.data) ? data.data : [],
            total: data?.total || (Array.isArray(data) ? data.length :
                   Array.isArray(data?.logs) ? data.logs.length :
                   Array.isArray(data?.data) ? data.data.length : 0),
            page: data?.page || 1,
            pageSize: data?.pageSize || (data?.limit || 50),
            totalPages: data?.totalPages || Math.ceil((data?.total || 0) / (data?.limit || 50))
          };

          return formattedResponse;
        } catch (error) {
          // If we have retries left and it's a transient error, retry
          if (retryCount < MAX_RETRY &&
              (error instanceof ApiRequestError &&
               ((error.statusCode === 0 || error.statusCode === undefined) || (error.statusCode && error.statusCode >= 500)))) {
            retryCount++;
            console.warn(`Error searching logs. Retrying (${retryCount}/${MAX_RETRY})...`, error);
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            return attemptSearch();
          }

          console.error('Error searching logs:', error);
          // Return empty data structure on error
          return {
            data: [],
            total: 0,
            page: 1,
            pageSize: 0,
            totalPages: 0
          };
        }
      };

      return attemptSearch();
    },

    ingest: async (logData: any): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(logData),
        mode: 'cors',
        credentials: 'include'
      });
      return handleResponse<void>(response, 'void');
    },
  },

  // Alerts endpoints
  alerts: {
    getAll: async (params?: FilterParams): Promise<PaginatedResponse<any>> => {
      try {
        const queryString = buildQueryString(params);
        const response = await fetch(`${API_BASE_URL}/alerts${queryString}`, {
          headers: {
            ...getAuthHeaders(true),
          },
          mode: 'cors',
          credentials: 'include'
        });

        const data = await handleResponse<any>(response, 'json');

        // Ensure we always return a properly structured response
        // Check if the response is an array directly
        if (Array.isArray(data)) {
          return {
            data: data,
            total: data.length,
            page: 1,
            pageSize: data.length,
            totalPages: 1
          };
        }

        // Check if the response has an alerts property which is an array
        if (data && Array.isArray(data.alerts)) {
          return {
            data: data.alerts,
            total: data.total || data.alerts.length,
            page: data.page || 1,
            pageSize: data.pageSize || data.alerts.length,
            totalPages: data.totalPages || 1
          };
        }

        // Check if the response has a data property which is an array
        if (data && Array.isArray(data.data)) {
          return data;
        }

        // If all else fails, return an empty data array
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 0,
          totalPages: 0
        };
      } catch (error) {
        console.error('Error fetching alerts:', error);
        // Return empty data on error
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 0,
          totalPages: 0
        };
      }
    },

    acknowledge: async (alertId: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(true),
        },
        body: JSON.stringify({ acknowledged: true }),
        mode: 'cors',
        credentials: 'include'
      });
      return handleResponse<void>(response, 'void');
    },
  },

  // Metrics endpoints
  metrics: {
    getAll: async (params?: FilterParams): Promise<ServiceMetrics[]> => {
      try {
        validateApiUrl();
        const queryString = buildQueryString(params);

        // Create headers with authentication - ensure both API key and auth token
        const headers = getAuthHeaders(true); // Pass true to include Authorization header

        console.log('Fetching metrics from:', `${API_BASE_URL}/metrics${queryString}`);
        console.log('Using headers for metrics:', {
          ...Object.keys(headers).reduce((acc, key) => {
            acc[key] = key.toLowerCase().includes('key') || key.toLowerCase().includes('auth')
              ? '[REDACTED]' : headers[key];
            return acc;
          }, {} as Record<string, string>)
        });

        const response = await fetch(`${API_BASE_URL}/metrics${queryString}`, {
          headers,
          mode: 'cors',
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('Metrics API error:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });

          // Special handling for 401 errors to assist with debugging
          if (response.status === 401) {
            console.error('Authentication error with metrics API. Please check:');
            console.error('1. Your API key is correct in localStorage (NEXT_PUBLIC_API_KEY and api_key)');
            console.error('2. Your auth_token is set correctly in localStorage');
            console.error('3. Backend .env has matching API_KEY and AUTH_TOKEN values');

            // Try to get the error details from the response
            try {
              const errorData = await response.clone().json();
              console.error('Error details:', errorData);
            } catch (e) {
              console.error('Could not parse error details');
            }
          }
        }

        const data = await handleResponse<ServiceMetrics[]>(response, 'json');
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching metrics:', error);
        return [];
      }
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
      // Use testConnection instead since pingEndpoint doesn't exist
      await endpointService.testConnection(id);
      return;
    },
  },

  // Services endpoints
  services: {
    getAll: async (params?: FilterParams): Promise<Service[]> => {
      try {
        validateApiUrl();
        const queryString = buildQueryString(params);

        // Create headers with authentication
        const headers = getAuthHeaders(true); // Pass true to include Authorization header

        console.log('Fetching services from:', `${API_BASE_URL}/services${queryString}`);
        console.log('Using headers for services:', {
          ...Object.keys(headers).reduce((acc, key) => {
            acc[key] = key.toLowerCase().includes('key') || key.toLowerCase().includes('auth')
              ? '[REDACTED]' : headers[key];
            return acc;
          }, {} as Record<string, string>)
        });

        const response = await fetch(`${API_BASE_URL}/services${queryString}`, {
          headers,
          mode: 'cors',
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('Services API error:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });

          // Special handling for 401 errors to assist with debugging
          if (response.status === 401) {
            console.error('Authentication error with services API. Please check:');
            console.error('1. Your API key is correct in localStorage (NEXT_PUBLIC_API_KEY and api_key)');
            console.error('2. Your auth_token is set correctly in localStorage');
            console.error('3. Backend .env has matching API_KEY and AUTH_TOKEN values');

            // Try to get the error details from the response
            try {
              const errorData = await response.clone().json();
              console.error('Error details:', errorData);
            } catch (e) {
              console.error('Could not parse error details');
            }
          }
        }

        const data = await handleResponse<any>(response, 'json');

        // Log the response data structure
        console.debug('Services response structure:', {
          isArray: Array.isArray(data),
          hasServicesProperty: data?.services !== undefined,
          dataType: typeof data
        });

        // Handle both array and object responses
        const services = Array.isArray(data) ? data : data?.services || [];

        if (!Array.isArray(services)) {
          throw new ApiRequestError(
            'Invalid services data format',
            500,
            'INVALID_DATA_FORMAT'
          );
        }

        // Also fetch metrics to combine with service data
        const metricsResponse = await fetch(`${API_BASE_URL}/metrics`, {
          headers,
          mode: 'cors',
          credentials: 'include'
        });

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
            responseTime: metric.response_time || metric.avg_response_time || metric.response_time_ms || metric.avg_response_time_ms || 0,
            lastUpdated: metric.last_updated || metric.updated_at || new Date().toISOString()
          });
        });

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
          metrics: metricsMap.get(service.name) || undefined
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
        const metricsResponse = await fetch(`${API_BASE_URL}/metrics?service=${service.name}`, {
          headers: getAuthHeaders(),
          mode: 'cors'
        });
        const metricsData = await handleResponse<any>(metricsResponse, 'json');
        const metric = Array.isArray(metricsData) ? metricsData[0] : metricsData;

        const metrics: ServiceMetrics = {
          uptime: metric?.total_requests > 0 ? 100 - (metric.errors / metric.total_requests * 100) : 100,
          errorRate: metric?.total_requests > 0 ? (metric.errors / metric.total_requests * 100) : 0,
          totalRequests: metric?.total_requests || 0,
          errors: metric?.errors || 0,
          responseTime: metric?.response_time || metric?.avg_response_time || metric?.response_time_ms || metric?.avg_response_time_ms || 0,
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

  // Debug helper to check authentication values
  debug: {
    checkAuth: () => {
      if (typeof window === 'undefined') {
        return {
          warning: 'Running on server - localStorage not available',
          serverEnvVars: {
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
            NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY ? 'set (redacted)' : 'not set',
            NEXT_PUBLIC_AUTH_TOKEN: process.env.NEXT_PUBLIC_AUTH_TOKEN ? 'set (redacted)' : 'not set'
          }
        };
      }

      return {
        localStorage: {
          'api_key': localStorage.getItem('api_key') ? 'set (redacted)' : 'not set',
          'NEXT_PUBLIC_API_KEY': localStorage.getItem('NEXT_PUBLIC_API_KEY') ? 'set (redacted)' : 'not set',
          'auth_token': localStorage.getItem('auth_token') ? 'set (redacted)' : 'not set'
        },
        headers: {
          standard: getAuthHeaders(false),
          withAuth: getAuthHeaders(true)
        }
      };
    }
  }
};
