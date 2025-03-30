"use client";

import { Service, ServiceResponse } from '@/types/common';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      const response = await fetch(`${API_URL}/api/services`);
      return handleResponse<Service[]>(response, 'json');
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  },

  getServiceById: async (id: string): Promise<ServiceResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/services/${id}`);
      return handleResponse<ServiceResponse>(response, 'json');
    } catch (error) {
      console.error(`Error fetching service ${id}:`, error);
      throw error;
    }
  },

  createService: async (serviceData: any): Promise<ServiceResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
        method: 'DELETE',
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
