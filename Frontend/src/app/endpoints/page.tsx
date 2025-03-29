"use client";

import { EndpointModal } from "@/components/endpoints/EndpointModal";
import MainLayout from "@/components/layouts/main-layout";
import { formatDate } from "@/lib/utils";
import { endpointService } from "@/services/endpointService";
import { AlertTriangle, Check, ExternalLink, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

// Define TypeScript interfaces for better type safety
interface Endpoint {
  id: string;
  name: string;
  url: string;
  service?: string;
  environment?: string;
  status: string;
  lastChecked: Date;
}

interface EndpointBackendData {
  _id: string;
  name?: string;
  url: string;
  service?: string;
  status?: string;
  last_checked?: string | number;
  environment?: string;
}

interface MonitoringState {
  [key: string]: {
    isActive: boolean;
    intervalId?: NodeJS.Timeout;
  };
}

export default function EndpointsPage() {
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [monitoringState, setMonitoringState] = useState<MonitoringState>({});
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Function to fetch and format endpoints
  const fetchEndpoints = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await endpointService.getAllEndpoints();

      console.log("Endpoints response:", response); // For debugging

      // Check if response is empty or undefined
      if (!response) {
        setEndpoints([]);
        setError("No data received from server");
        return;
      }

      // Fix: Ensure we're working with an array by checking response structure
      const endpointsData = Array.isArray(response) ? response :
                          (response?.data || response?.endpoints || []);

      if (endpointsData.length === 0) {
        setEndpoints([]);
        return; // Don't set an error for empty results
      }

      // Transform backend data to match frontend structure
      const formattedEndpoints = endpointsData.map((endpoint: EndpointBackendData) => ({
        id: endpoint._id,
        name: endpoint.name || `${endpoint.service || 'Unnamed'} API`,
        url: endpoint.url,
        status: endpoint.status || "active",
        service: endpoint.service || "Unknown",
        environment: endpoint.environment || "production",
        lastChecked: endpoint.last_checked ? new Date(endpoint.last_checked) : new Date()
      }));

      // Apply search filter if any
      let filteredEndpoints = formattedEndpoints;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredEndpoints = filteredEndpoints.filter((e: Endpoint) =>
          e.name.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query) ||
          (e.service && e.service.toLowerCase().includes(query))
        );
      }

      setEndpoints(filteredEndpoints);
    } catch (err: unknown) {
      console.error("Error fetching endpoints:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, [searchQuery]);

  // Function to handle endpoint registration
  const handleRegisterEndpoint = async (formData: Record<string, any>) => {
    try {
      const newEndpoint = await endpointService.createEndpoint(formData);
      console.log("Created endpoint:", newEndpoint);

      // Refresh the endpoints list
      await fetchEndpoints();

      // Close the modal
      setShowRegisterModal(false);

      // Start monitoring the new endpoint automatically
      if (newEndpoint && newEndpoint._id) {
        startMonitoring(newEndpoint._id, newEndpoint.url);
      }

      return Promise.resolve();
    } catch (err: unknown) {
      console.error("Error registering endpoint:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      return Promise.reject(err);
    }
  };

  // Function to send a request to an endpoint to generate logs
  const pingEndpoint = async (id: string, url: string) => {
    try {
      // Make an API call to our own service to ping the endpoint
      await endpointService.pingEndpoint(id, url);
      console.log(`Sent log request for endpoint ${id}`);
    } catch (err) {
      console.error(`Error pinging endpoint ${id}:`, err);
    }
  };

  // Start monitoring an endpoint
  const startMonitoring = (id: string, url: string) => {
    // Stop any existing monitoring for this endpoint
    stopMonitoring(id);

    // Create a new interval to ping the endpoint every 30 seconds
    const intervalId = setInterval(() => {
      pingEndpoint(id, url);
    }, 30000); // 30 seconds

    // Initial ping
    pingEndpoint(id, url);

    // Update monitoring state
    setMonitoringState(prev => ({
      ...prev,
      [id]: { isActive: true, intervalId }
    }));
  };

  // Stop monitoring an endpoint
  const stopMonitoring = (id: string) => {
    const currentMonitoring = monitoringState[id];

    if (currentMonitoring && currentMonitoring.intervalId) {
      clearInterval(currentMonitoring.intervalId);

      setMonitoringState(prev => ({
        ...prev,
        [id]: { isActive: false }
      }));
    }
  };

  // Toggle monitoring for an endpoint
  const toggleMonitoring = (id: string, url: string) => {
    const current = monitoringState[id];

    if (current && current.isActive) {
      stopMonitoring(id);
    } else {
      startMonitoring(id, url);
    }
  };

  // Cleanup monitoring intervals when component unmounts
  useEffect(() => {
    return () => {
      Object.entries(monitoringState).forEach(([id, state]) => {
        if (state.intervalId) {
          clearInterval(state.intervalId);
        }
      });
    };
  }, []);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Function to get status indicator
  const getStatusIndicator = (status: string) => {
    const isActive = status.toLowerCase() === "active";
    return (
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className={isActive ? "text-green-500" : "text-red-500"}>
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>
    );
  };

  // Function to get status icon based on status
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Check className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Check className="h-4 w-4 text-green-500" />;
    }
  };

  // Handle deleting an endpoint
  const handleDeleteEndpoint = async (endpoint: Endpoint) => {
    setEndpointToDelete(endpoint);
    setDeleteError(null);
  };

  // Confirm endpoint deletion
  const confirmDeleteEndpoint = async () => {
    if (!endpointToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    setSuccessMessage(null);

    try {
      await endpointService.deleteEndpoint(endpointToDelete.id);

      // Stop monitoring if active
      if (monitoringState[endpointToDelete.id]?.isActive) {
        stopMonitoring(endpointToDelete.id);
      }

      // Remove from local state
      setEndpoints(prev => prev.filter(e => e.id !== endpointToDelete.id));

      // Set success message
      setSuccessMessage(`"${endpointToDelete.name}" was deleted successfully`);

      // Close the confirmation dialog
      setEndpointToDelete(null);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error(`Error deleting endpoint ${endpointToDelete.id}:`, err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete endpoint");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Success message notification */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">External Endpoints</h1>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Endpoint
          </button>
        </div>

        {/* Filters and Search */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All Services</option>
              <option value="gateway">Gateway</option>
              <option value="auth">Auth</option>
              <option value="billing">Billing</option>
              <option value="api">API</option>
            </select>
          </div>
          <div>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>

        {/* Endpoints Table */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <p>Loading endpoints...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Error Loading Endpoints</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
              <div className="mt-4">
                <button
                  onClick={() => fetchEndpoints()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </button>
              </div>
            </div>
          ) : endpoints.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Endpoints Found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? "No endpoints match your search criteria."
                  : "You haven't registered any endpoints yet."}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Endpoint
                </button>
              </div>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead className="text-xs bg-muted/50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">URL</th>
                    <th scope="col" className="px-6 py-3">Service</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Last Checked</th>
                    <th scope="col" className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((endpoint) => (
                    <tr key={endpoint.id} className="bg-card border-b hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium">{endpoint.name}</td>
                      <td className="px-6 py-4">
                        <a
                          href={endpoint.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          <span className="truncate max-w-[200px]">{endpoint.url}</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </td>
                      <td className="px-6 py-4">{endpoint.service}</td>
                      <td className="px-6 py-4">
                        {getStatusIndicator(endpoint.status)}
                      </td>
                      <td className="px-6 py-4">{formatDate(endpoint.lastChecked)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleMonitoring(endpoint.id, endpoint.url)}
                            className="p-1 rounded-md hover:bg-muted"
                            title={monitoringState[endpoint.id]?.isActive ? "Stop Monitoring" : "Start Monitoring"}
                          >
                            <RefreshCw className={`h-4 w-4 ${monitoringState[endpoint.id]?.isActive ? 'text-green-500 animate-spin' : 'text-muted-foreground'}`} />
                          </button>

                          <button
                            onClick={() => handleDeleteEndpoint(endpoint)}
                            className="p-1 rounded-md hover:bg-muted text-red-500 hover:text-red-700"
                            title="Delete Endpoint"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Register Endpoint Modal */}
      <EndpointModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSubmit={handleRegisterEndpoint}
      />

      {/* Delete Confirmation Modal */}
      {endpointToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-md mx-4 border">
            <h3 className="text-xl font-semibold mb-2">Delete Endpoint</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete <span className="font-medium text-foreground">{endpointToDelete.name}</span>?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete the endpoint
              and remove all monitoring data associated with it.
            </p>

            {deleteError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p className="text-sm">{deleteError}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEndpointToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-input bg-background rounded-md text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEndpoint}
                disabled={isDeleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
