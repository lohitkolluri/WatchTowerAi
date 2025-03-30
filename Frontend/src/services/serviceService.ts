const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'An error occurred while fetching data');
  }
  return response.json();
}

export const serviceService = {
  getAllServices: async () => {
    try {
      const response = await fetch(`${API_URL}/api/services`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  },

  getServiceById: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/services/${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error(`Error fetching service ${id}:`, error);
      throw error;
    }
  },

  createService: async (serviceData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  },

  updateService: async (id: string, serviceData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });
      return handleResponse(response);
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

      return handleResponse(response);
    } catch (error) {
      console.error(`Error deleting service ${id}:`, error);
      throw error;
    }
  }
};
