"use client";

import { Service, ServiceResponse } from '@/types/common';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://watchtowerai.onrender.com';

// Default fetch options
const defaultFetchOptions: RequestInit = {
  mode: 'cors',
  credentials: 'include',
  cache: 'no-store'
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  // Add API key
  const apiKey = typeof window !== 'undefined'
    ? window.localStorage.getItem('NEXT_PUBLIC_API_KEY') || 'test_api_key'
    : process.env.NEXT_PUBLIC_API_KEY || 'test_api_key';

  headers['X-API-Key'] = apiKey;

  // Add OAuth token
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem('auth_token') || 'demo_token_test'
    : process.env.NEXT_PUBLIC_AUTH_TOKEN || 'demo_token_test';

  if (token && !token.startsWith('Bearer ')) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (token) {
    headers['Authorization'] = token;
  }

  return headers;
};

// Helper function to handle API responses
async function handleResponse<T>(response: Response, type?: string): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred while fetching data';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // JSON parsing failed, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (type === 'void') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const serviceService = {
  getAllServices: async (): Promise<Service[]> => {
    try {
      const response = await fetch(`${API_URL}/api/services`, {
        ...defaultFetchOptions,
        headers: getAuthHeaders()
      });
      return handleResponse<Service[]>(response, 'json');
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  },

  getServiceById: async (id: string): Promise<ServiceResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/services/${id}`, {
        ...defaultFetchOptions,
        headers: getAuthHeaders()
      });
      return handleResponse<ServiceResponse>(response, 'json');
    } catch (error) {
      console.error(`Error fetching service ${id}:`, error);
      throw error;
    }
  },

  createService: async (serviceData: any): Promise<ServiceResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/services`, {
        ...defaultFetchOptions,
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(serviceData),
      });
      return handleResponse<ServiceResponse>(response, 'json');
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  },

  updateService: async (id: string, serviceData: any): Promise<ServiceResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/services/${id}`, {
        ...defaultFetchOptions,
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(serviceData),
      });
      return handleResponse<ServiceResponse>(response, 'json');
    } catch (error) {
      console.error(`Error updating service ${id}:`, error);
      throw error;
    }
  },

  deleteService: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/services/${id}`, {
        ...defaultFetchOptions,
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete service";

        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // JSON parsing failed, use status text
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 404) {
          throw new Error("Service not found or already deleted");
        } else if (response.status === 500) {
          throw new Error("Server error while deleting service");
        } else {
          throw new Error(errorMessage);
        }
      }

      return handleResponse<void>(response, 'void');
    } catch (error) {
      console.error(`Error deleting service ${id}:`, error);
      throw error;
    }
  }
};
