import { endpointService } from '@/services/endpointService';

// API service for WatchTowerAI

const API_BASE_URL = 'http://127.0.0.1:8000';

// Helper function to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'An error occurred while fetching data');
  }
  return response.json();
}

// API endpoints
export const api = {
  // Logs endpoints
  logs: {
    getAll: async (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/logs${queryString}`);
      return handleResponse(response);
    },
    search: async (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/logs/search${queryString}`);
      return handleResponse(response);
    },
    ingest: async (logData: any) => {
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });
      return handleResponse(response);
    },
  },

  // Alerts endpoints
  alerts: {
    getAll: async (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/alerts${queryString}`);
      return handleResponse(response);
    },
    acknowledge: async (alertId: string) => {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acknowledged: true }),
      });
      return handleResponse(response);
    },
  },

  // Metrics endpoints
  metrics: {
    getAll: async (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/metrics${queryString}`);
      return handleResponse(response);
    },
  },

  // Endpoints monitoring
  endpoints: {
    getAll: endpointService.getAllEndpoints,
    getById: endpointService.getEndpointById,
    add: endpointService.createEndpoint,
    update: endpointService.updateEndpoint,
    delete: endpointService.deleteEndpoint,
  },

  // Services endpoints
  services: {
    getAll: async (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/services${queryString}`);
      return handleResponse(response);
    },
    getById: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/services/${id}`);
      return handleResponse(response);
    },
    create: async (serviceData: any) => {
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });
      return handleResponse(response);
    },
    update: async (id: string, serviceData: any) => {
      const response = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    },
  },

  // Health check
  health: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },
};
