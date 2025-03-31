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
      const response = await axios.get(`${BASE_URL}/logs`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
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
