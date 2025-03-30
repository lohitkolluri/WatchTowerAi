const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Helper function to handle API responses
async function handleResponse(response: Response) {
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
  return response.json();
}

export const endpointService = {
  getAllEndpoints: async () => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching endpoints:', error);
      throw error;
    }
  },

  getEndpointById: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints/${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error(`Error fetching endpoint ${id}:`, error);
      throw error;
    }
  },

  createEndpoint: async (endpointData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpointData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error creating endpoint:', error);
      throw error;
    }
  },

  updateEndpoint: async (id: string, endpointData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpointData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error(`Error updating endpoint ${id}:`, error);
      throw error;
    }
  },

  deleteEndpoint: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/endpoints/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete endpoint";

        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // JSON parsing failed, use status text
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 404) {
          throw new Error("Endpoint not found or already deleted");
        } else if (response.status === 500) {
          throw new Error("Server error while deleting endpoint");
        } else {
          throw new Error(errorMessage);
        }
      }

      return handleResponse(response);
    } catch (error) {
      console.error(`Error deleting endpoint ${id}:`, error);
      throw error;
    }
  },

  pingEndpoint: async (id: string, url: string) => {
    try {
      // Ensure we have a valid ID
      if (!id) {
        throw new Error("Endpoint ID is required");
      }

      // Make the API call
      const response = await fetch(`${API_URL}/api/endpoints/${id}/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }) // Include the URL in the request body
      });

      // Handle non-200 responses
      if (!response.ok) {
        let errorMessage = "Failed to ping endpoint";

        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // JSON parsing failed, use status text
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 404) {
          throw new Error("Error: Endpoint not found. Please check if the endpoint still exists.");
        } else if (response.status === 500) {
          throw new Error("Server error while pinging endpoint. Please try again later.");
        } else {
          throw new Error(errorMessage);
        }
      }

      return handleResponse(response);
    } catch (error) {
      console.error(`Error pinging endpoint ${id}:`, error);
      throw error;
    }
  }
};
