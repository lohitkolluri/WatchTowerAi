import axios from 'axios';

export interface Log {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  service: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

export interface LogsResponse {
  logs: Log[];
  total: number;
}

export interface LogsQueryParams {
  page?: number;
  limit?: number;
  service?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const logsService = {
  async getLogs(params: LogsQueryParams = {}): Promise<LogsResponse> {
    try {
      // Clean and sanitize search parameter if it exists
      if (params.search) {
        params.search = params.search.trim();
        console.log(`Searching for logs with term: "${params.search}"`);
      }

      // Create URLSearchParams to properly encode parameters
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      // Log the full request URL for debugging
      const requestUrl = `${BASE_URL}/logs?${searchParams.toString()}`;
      console.log('Fetching logs from:', requestUrl);

      const response = await axios.get(requestUrl);

      // Ensure we have a properly structured response
      const data = response.data;
      if (!data) {
        console.warn('Empty response received from logs API');
        return { logs: [], total: 0 };
      }

      // Log the response structure for debugging
      console.log('Logs API response structure:', {
        isArray: Array.isArray(data),
        hasLogsProperty: data.logs !== undefined,
        hasDataProperty: data.data !== undefined,
        recordCount: Array.isArray(data) ? data.length :
                     Array.isArray(data.logs) ? data.logs.length :
                     Array.isArray(data.data) ? data.data.length : 0
      });

      // Handle different response formats
      if (Array.isArray(data)) {
        return { logs: data, total: data.length };
      }

      if (Array.isArray(data.logs)) {
        return { logs: data.logs, total: data.total || data.logs.length };
      }

      if (Array.isArray(data.data)) {
        return { logs: data.data, total: data.total || data.data.length };
      }

      // Default fallback
      console.warn('Unexpected logs API response format:', data);
      return { logs: [], total: 0 };
    } catch (error) {
      // Enhanced error handling with detailed logging
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;

        console.error('API Error fetching logs:', {
          status: statusCode,
          message: error.message,
          responseData,
          requestParams: params
        });

        // Report specific error types for better debugging
        if (statusCode === 404) {
          console.error('Logs endpoint not found. Check API URL configuration.');
        } else if (statusCode === 401 || statusCode === 403) {
          console.error('Authentication/authorization error accessing logs.');
        } else if (statusCode && statusCode >= 500) {
          console.error('Server error when fetching logs. The API server might be down or experiencing issues.');
        }
      } else {
        console.error('Non-Axios error fetching logs:', error);
      }

      // Return empty data on error instead of throwing
      return { logs: [], total: 0 };
    }
  },

  async getServicesList(): Promise<string[]> {
    try {
      const response = await axios.get(`${BASE_URL}/logs/services`);
      return response.data;
    } catch (error) {
      console.error('Error fetching services list:', error);
      throw error;
    }
  },

  async clearLogs(): Promise<void> {
    try {
      await axios.delete(`${BASE_URL}/logs`);
    } catch (error) {
      console.error('Error clearing logs:', error);
      throw error;
    }
  }
};

export default logsService;
