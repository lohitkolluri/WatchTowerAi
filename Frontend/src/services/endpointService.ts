"use client";

import { api } from '@/lib/api';
import { EndpointData, EndpointResponse } from '@/types/common';

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

export const endpointService = {
  getAllEndpoints: async (): Promise<EndpointData[]> => {
    // Max number of retries
    const MAX_RETRIES = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= MAX_RETRIES) {
      try {
        // Try the official endpoint with different paths and caching prevention
        const timestamp = Date.now();
        const urls = [
          `${API_URL}/api/endpoints?_t=${timestamp}`,
          `${API_URL}/api/endpoints?_t=${timestamp}` // Use the tested API endpoint
        ];

        // Add cache control and CORS headers
        const headers = {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };

        const fetchOptions = {
          headers,
          mode: 'cors' as RequestMode,
          credentials: 'include' as RequestCredentials
        };

        // Try each URL path until we get a successful response
        for (const url of urls) {
          try {
            console.log(`Attempting to fetch endpoints from: ${url}`);
            const response = await fetch(url, fetchOptions);

            if (response.ok) {
              const data = await response.json();
              console.log(`Success! Fetched endpoints from: ${url}`, data);
              // Handle various response formats
              if (Array.isArray(data)) {
                return data;
              } else if (data && typeof data === 'object') {
                if (data.endpoints && Array.isArray(data.endpoints)) {
                  return data.endpoints;
                } else if (data.data && Array.isArray(data.data)) {
                  return data.data;
                }
              }
            } else {
              console.warn(`Failed to fetch from ${url} with status: ${response.status} ${response.statusText}`);
            }
          } catch (urlError) {
            console.warn(`Endpoint fetch failed for URL ${url}:`, urlError);
            // Continue to next URL
          }
        }

        // Return empty array when all URLs fail but don't throw
        console.warn('All endpoint API paths returned invalid data');
        return [];
      } catch (error) {
        console.error(`Error fetching endpoints (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Increment retry counter
        retryCount++;

        if (retryCount <= MAX_RETRIES) {
          // Wait with exponential backoff before retrying
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          console.log(`Retrying endpoint fetch after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Return empty array instead of throwing after all retries
          console.error('All endpoint fetch attempts failed');
          return [];
        }
      }
    }

    // Return empty array as fallback
    return [];
  },

  getEndpointById: async (id: string): Promise<EndpointResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'include'
      });
      return handleResponse<EndpointResponse>(response, 'json');
    } catch (error) {
      console.error(`Error fetching endpoint ${id}:`, error);
      throw error;
    }
  },

  createEndpoint: async (endpointData: any): Promise<EndpointResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpointData),
        mode: 'cors',
        credentials: 'include'
      });
      const result = await handleResponse<EndpointResponse>(response, 'json');

      // After successfully creating the endpoint, fetch services
      try {
        await api.services.getAll();
      } catch (error) {
        console.warn('Error fetching services after endpoint creation:', error);
      }

      return result;
    } catch (error) {
      console.error('Error creating endpoint:', error);
      throw error;
    }
  },

  updateEndpoint: async (id: string, endpointData: any): Promise<EndpointResponse> => {
    try {
      console.log(`Updating endpoint ${id} with data:`, endpointData);

      // Ensure environment is properly sent
      if (endpointData.environment) {
        // Make sure it's a string and properly formatted
        endpointData.environment = String(endpointData.environment).trim().toLowerCase();
        console.log(`Environment set to: ${endpointData.environment}`);
      }

      const response = await fetch(`${API_URL}/api/endpoints/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpointData),
        mode: 'cors',
        credentials: 'include'
      });

      // Log the response for debugging
      const result = await handleResponse<EndpointResponse>(response, 'json');
      console.log(`Update endpoint response:`, result);

      // Force a delay to ensure the server has time to process
      await new Promise(resolve => setTimeout(resolve, 300));

      return result;
    } catch (error) {
      console.error(`Error updating endpoint ${id}:`, error);
      throw error;
    }
  },

  deleteEndpoint: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'include'
      });
      return handleResponse<void>(response, 'void');
    } catch (error) {
      console.error(`Error deleting endpoint ${id}:`, error);
      throw error;
    }
  },

  // Add a method to test the connection to an API endpoint
  testConnection: async (url: string, method: string = 'GET'): Promise<{ success: boolean, message: string, responseTime?: number }> => {
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method,
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
      }).catch(error => {
        throw new Error(`Connection failed: ${error.message}`);
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: `Connection successful (${response.status} ${response.statusText})`,
          responseTime
        };
      }

      return {
        success: false,
        message: `Connection failed with status: ${response.status} ${response.statusText}`,
        responseTime
      };
    } catch (error) {
      console.error('Error testing connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred during connection test'
      };
    }
  }
};
