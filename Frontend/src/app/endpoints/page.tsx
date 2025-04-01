"use client";

import { EndpointModal } from "@/components/endpoints/EndpointModal";
import MainLayout from "@/components/layouts/main-layout";
import { formatDate } from "@/lib/utils";
import { endpointService } from "@/services/endpointService";
import { AlertTriangle, Check, ExternalLink, Plus, RefreshCw, Search, Trash2, X, Settings, Filter, AlertCircle, Clock as ClockIcon, Lock, Edit, MoreVertical, PlusCircle, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useEnvironments, normalizeEnvironment, getEnvironmentLabel } from "@/lib/environments";
import { Label } from "@/components/ui/label";
import { Slash } from "lucide-react";
import { debounce } from "lodash";

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

interface EndpointData {
  _id: string;
  name: string;
  url: string;
  service?: string;
  status?: string;
  last_checked?: string | number;
  environment?: string;
  description?: string;
  method?: string;
}

interface MonitoringState {
  isActive: boolean;
  intervalId?: NodeJS.Timeout;
  hasError: boolean;
}

// Load initial monitoring state from localStorage
const loadMonitoringState = () => {
  if (typeof window === 'undefined') return {};
  const saved = localStorage.getItem('monitoringState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Convert the saved state to match our MonitoringState interface
      const state: Record<string, MonitoringState> = {};
      Object.entries(parsed).forEach(([id, value]) => {
        if (typeof value === 'object' && value !== null) {
          state[id] = {
            isActive: (value as any).isActive || false,
            hasError: (value as any).hasError || false,
            intervalId: undefined // We'll recreate intervals for active monitors
          };
        }
      });
      return state;
    } catch (e) {
      console.error('Error loading monitoring state:', e);
      return {};
    }
  }
  return {};
};

export default function EndpointsPage() {
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [monitoringState, setMonitoringState] = useState<Record<string, MonitoringState>>(loadMonitoringState());
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    environment: "all",
    service: "all",
    status: "all"
  });
  const {
    allEnvironments,
    customEnvironments,
    addEnvironment,
    removeEnvironment
  } = useEnvironments();
  const [environments, setEnvironments] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Endpoint;
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [newEnvironment, setNewEnvironment] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [newlyAddedEnvs, setNewlyAddedEnvs] = useState<string[]>([]);

  // Add a separate useEffect to handle successMessage changes
  useEffect(() => {
    if (successMessage) {
      // Clear success message after a short delay
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Apply filters to endpoints
  const applyFilters = useCallback((endpoints: Endpoint[], currentFilters: typeof filters) => {
    return endpoints.filter(endpoint => {
      // Search filter - enhanced to search across multiple fields
      if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        const nameMatch = (endpoint.name || '').toLowerCase().includes(searchLower);
        const urlMatch = (endpoint.url || '').toLowerCase().includes(searchLower);
        const serviceMatch = (endpoint.service || '').toLowerCase().includes(searchLower);
        const environmentMatch = (endpoint.environment || '').toLowerCase().includes(searchLower);
        const statusMatch = (endpoint.status || '').toLowerCase().includes(searchLower);

        if (!nameMatch && !urlMatch && !serviceMatch && !environmentMatch && !statusMatch) {
          return false;
        }
      }

      // Environment filter
      if (currentFilters.environment !== 'all' && (!endpoint.environment || endpoint.environment !== currentFilters.environment)) {
        return false;
      }

      // Service filter
      if (currentFilters.service !== 'all' && (!endpoint.service || endpoint.service !== currentFilters.service)) {
        return false;
      }

      // Status filter
      if (currentFilters.status !== 'all' && (!endpoint.status || endpoint.status !== currentFilters.status)) {
        return false;
      }

      return true;
    });
  }, []);

  // Get filtered and sorted endpoints
  const filteredEndpoints = useMemo(() => {
    // First apply the filters from the filter state
    const filtered = applyFilters(endpoints, filters);

    // Then sort the filtered endpoints
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (!aValue || !bValue) return 0;

      if (aValue === bValue) return 0;

      const compareResult = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? compareResult : -compareResult;
    });
  }, [endpoints, filters, applyFilters, sortConfig, searchQuery]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    debouncedSearch(searchTerm);
  };

  const clearSearch = () => {
    const searchInput = document.querySelector('input[placeholder="Search endpoints..."]') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    setFilters(prev => ({ ...prev, search: '' }));
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      environment: "all",
      service: "all",
      status: "all"
    });
    const searchInput = document.querySelector('input[placeholder="Search endpoints..."]') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
  };

  // Update the fetchEndpoints function to handle client-side filtering
  const fetchEndpoints = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await endpointService.getAllEndpoints();

      // Format endpoint data with normalized environments
      const formattedEndpoints = response
        .filter(endpoint => endpoint._id)
        .map((endpoint: EndpointData) => ({
          id: endpoint._id,
          name: endpoint.name,
          url: endpoint.url,
          service: endpoint.service || '',
          environment: normalizeEnvironment(endpoint.environment || ''),
          status: endpoint.status || "active",
          lastChecked: endpoint.last_checked
            ? new Date(endpoint.last_checked)
            : new Date()
        }));

      // Sort endpoints by name initially
      const sortedEndpoints = formattedEndpoints.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );

      setEndpoints(sortedEndpoints);

      // Extract unique environments and services
      const uniqueEnvironments = Array.from(new Set(formattedEndpoints.map(e => e.environment)))
        .filter(Boolean)
        .sort();

      const uniqueServices = Array.from(new Set(formattedEndpoints.map(e => e.service)))
        .filter(Boolean)
        .sort();

      setEnvironments(uniqueEnvironments);
      setServices(uniqueServices);

    } catch (error) {
      console.error("Error fetching endpoints:", error);
      setError("Failed to fetch endpoints. Please try again later.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Ping a single endpoint
  const pingEndpoint = async (id: string, url: string) => {
    try {
      // Validate that the ID exists and is not empty
      if (!id || id.trim() === '') {
        console.error("Cannot ping endpoint: ID is missing or empty");
        toast.error("Cannot ping endpoint: Invalid endpoint ID");
        return false;
      }

      await endpointService.pingEndpoint(id);
      setMonitoringState(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          hasError: false
        }
      }));
      return true;
    } catch (error) {
      console.error(`Error pinging endpoint ${id}:`, error);
      setMonitoringState(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          hasError: true
        }
      }));
      return false;
    }
  };

  // Ping all endpoints
  const pingAllEndpoints = async () => {
    const results = await Promise.all(
      endpoints.map(endpoint => {
        // Skip endpoints with missing IDs
        if (!endpoint.id) return false;
        return pingEndpoint(endpoint.id, endpoint.url);
      })
    );
    return results.every(result => result);
  };

  // Start monitoring the endpoints
  const startMonitoring = useCallback(() => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }

    // Filter out endpoints with missing IDs
    const validEndpoints = endpoints.filter(endpoint => endpoint.id && endpoint.id.trim() !== '');

    // Set active state for all valid endpoints
    setMonitoringState(prev => {
      const newState = { ...prev };
      validEndpoints.forEach(endpoint => {
        newState[endpoint.id] = {
          ...newState[endpoint.id],
          isActive: true
        };
      });
      return newState;
    });

    // Create a new interval
    const interval = setInterval(async () => {
      await pingAllEndpoints();
    }, 60000); // Check every minute

    setMonitoringInterval(interval);
  }, [endpoints]); // Remove monitoringInterval from dependency array to break the cycle

  // Stop monitoring a specific endpoint
  const stopMonitoring = (id: string) => {
    setMonitoringState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isActive: false
      }
    }));
  };

  // Toggle monitoring for a specific endpoint
  const toggleMonitoring = (id: string | undefined, url: string) => {
    // Validate ID before proceeding
    if (!id || id.trim() === '') {
      console.error("Cannot toggle monitoring: ID is missing or empty");
      toast.error("Cannot monitor this endpoint: Invalid endpoint ID");
      return;
    }

    const isCurrentlyActive = monitoringState[id]?.isActive || false;

    if (isCurrentlyActive) {
      stopMonitoring(id);
    } else {
      // Set the specific endpoint to active state
      setMonitoringState(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          isActive: true
        }
      }));

      // Ping it immediately
      pingEndpoint(id, url);
    }
  };

  // Save monitoring state to localStorage whenever it changes
  useEffect(() => {
    // Remove intervalId before saving as it can't be serialized
    const stateToSave = Object.entries(monitoringState).reduce((acc, [id, state]) => {
      acc[id] = {
        isActive: state.isActive,
        hasError: state.hasError
      };
      return acc;
    }, {} as Record<string, { isActive: boolean; hasError: boolean }>);

    localStorage.setItem('monitoringState', JSON.stringify(stateToSave));
  }, [monitoringState]);

  // Check local storage for monitoring state and start monitoring if active
  useEffect(() => {
    const savedState = localStorage.getItem('monitoringState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Convert to proper state format if needed
        if (typeof parsedState === 'object') {
          setMonitoringState(parsedState);
        }
      } catch (e) {
        console.error('Error loading monitoring state:', e);
      }
    }
  }, []);

  // Start monitoring active endpoints when endpoints are loaded
  useEffect(() => {
    if (endpoints.length > 0) {
      // Filter out any endpoints that don't have valid IDs
      const validEndpoints = endpoints.filter(endpoint => endpoint.id && endpoint.id.trim() !== '');

      // Check if any of the valid endpoints should be actively monitored
      const hasActiveEndpoints = validEndpoints.some(endpoint =>
        monitoringState[endpoint.id]?.isActive
      );

      if (hasActiveEndpoints) {
        startMonitoring();
      }
    }
  }, [endpoints, startMonitoring]);

  // Update the endpoints array when filters change
  useEffect(() => {
    // Only fetch when filters or search actually change, not on initial render
    if (isLoading) return;
    fetchEndpoints();
  }, [filters, fetchEndpoints]);

  // Initial fetch of endpoints
  useEffect(() => {
    fetchEndpoints();

    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchEndpoints();
    }, 30000); // Refresh every 30 seconds

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchEndpoints]); // Add fetchEndpoints to the dependency array

  // Function to handle endpoint registration
  const handleRegisterEndpoint = async (formData: Record<string, any>) => {
    try {
      // Ensure required fields are present
      if (!formData.url || !formData.name || !formData.service) {
        throw new Error("URL, name, and service are required fields");
      }

      // Format the endpoint data
      const endpointData = {
        name: formData.name,
        url: formData.url,
        method: formData.method || "GET",
        service: formData.service,
        description: formData.description || `Endpoint for ${formData.service}`,
        environment: formData.environment || "production"
      };

      // Register the endpoint
      const newEndpoint = await endpointService.createEndpoint(endpointData);
      console.log("Created endpoint:", newEndpoint);

      // Show success message
      toast.success("Endpoint registered successfully");

      // Instead of calling fetchEndpoints, update the state directly
      if (newEndpoint && newEndpoint.endpoint) {
        const formattedEndpoint = {
          id: newEndpoint.endpoint._id,
          name: newEndpoint.endpoint.name,
          url: newEndpoint.endpoint.url,
          service: newEndpoint.endpoint.service,
          environment: normalizeEnvironment(newEndpoint.endpoint.environment),
          status: newEndpoint.endpoint.status || "active",
          lastChecked: new Date()
        };

        setEndpoints(prev => [...prev, formattedEndpoint]);

        // Update services and environments lists if needed
        if (formattedEndpoint.service && !services.includes(formattedEndpoint.service)) {
          setServices(prev => [...prev, formattedEndpoint.service!].sort());
        }

        if (formattedEndpoint.environment && !environments.includes(formattedEndpoint.environment)) {
          setEnvironments(prev => [...prev, formattedEndpoint.environment!].sort());
        }
      }

      // Close the modal
      setShowRegisterModal(false);

      // Start monitoring the new endpoint after a short delay to ensure registration is complete
      if (newEndpoint && newEndpoint.endpoint && newEndpoint.endpoint._id) {
        setTimeout(() => {
          // Set the specific endpoint to active state
          setMonitoringState(prev => ({
            ...prev,
            [newEndpoint.endpoint._id]: {
              ...prev[newEndpoint.endpoint._id],
              isActive: true
            }
          }));

          // Try to ping the endpoint
          try {
            endpointService.pingEndpoint(newEndpoint.endpoint._id);
          } catch (error) {
            console.error("Error pinging new endpoint:", error);
          }
        }, 1000);
      }

      return Promise.resolve();
    } catch (err: unknown) {
      console.error("Error registering endpoint:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      toast.error(`Failed to register endpoint: ${errorMessage}`);
      return Promise.reject(err);
    }
  };

  // Function to handle sorting
  const handleSort = (key: keyof Endpoint) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Update handleAddEnvironment to use our hook function
  const handleAddEnvironment = () => {
    // Trim the new environment and normalize to lowercase
    const cleanedEnv = newEnvironment.trim();
    const normalizedEnv = cleanedEnv.toLowerCase();

    if (cleanedEnv === '') {
      setDuplicateError('Environment name cannot be empty');
      return;
    }

    // Check if the environment already exists
    const existingEnvs = allEnvironments.map(env => env.value.toLowerCase());
    if (existingEnvs.includes(normalizedEnv) ||
      customEnvironments.map(env => env.toLowerCase()).includes(normalizedEnv)) {
      setDuplicateError(`Environment "${cleanedEnv}" already exists`);
      return;
    }

    addEnvironment(cleanedEnv);
    setNewlyAddedEnvs([...newlyAddedEnvs, cleanedEnv]);
    setNewEnvironment('');
    setDuplicateError('');
  };

  // Update handleRemoveEnvironment to use our hook function
  const handleRemoveEnvironment = (env: string) => {
    removeEnvironment(env);
    setNewlyAddedEnvs(newlyAddedEnvs.filter(e => e !== env));
  };

  // Get all distinct environments from endpoints and add standard ones
  const uniqueEnvironments = Array.from(new Set([
    ...environments,
    ...(endpoints.map((e: Endpoint) => e.environment?.toLowerCase() || 'production'))
  ])).sort();

  // Format environments for display with proper capitalization
  const formattedEnvironments = uniqueEnvironments.map(env => {
    // Check if it's a standard environment
    const standardEnv = allEnvironments.find(e => e.value === env);
    if (standardEnv) {
      return standardEnv.label;
    }
    // Otherwise capitalize first letter
    return env.charAt(0).toUpperCase() + env.slice(1);
  });

  // Environment management dialog
  const environmentDialogContent = (
    <DialogContent className="sm:max-w-md shadow-xl border">
      <DialogHeader>
        <DialogTitle className="text-xl">Manage Environments</DialogTitle>
        <DialogDescription>
          Add or remove custom environments for your endpoints.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-environment">Add New Environment</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="new-environment"
                placeholder="Enter environment name..."
                value={newEnvironment}
                onChange={(e) => {
                  setNewEnvironment(e.target.value);
                  setDuplicateError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddEnvironment();
                  }
                }}
                className="focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <Button
                onClick={handleAddEnvironment}
                className="flex items-center gap-1.5 hover:shadow-md transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </Button>
            </div>
            {duplicateError && (
              <p className="text-sm text-destructive">{duplicateError}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 border rounded-md p-4 bg-background shadow-sm">
          <div>
            <h3 className="font-medium text-sm text-foreground mb-3">Standard Environments</h3>
            <div className="space-y-2">
              {allEnvironments
                .filter(env => !customEnvironments.includes(env.value))
                .map((env) => (
                  <div
                    key={`std-env-${env.value}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-md bg-muted/50 border border-border/50 hover:border-border/80 transition-colors"
                  >
                    <span className="text-sm font-medium">{env.label}</span>
                    <Badge variant="outline" className="text-xs font-normal bg-background">
                      Default
                    </Badge>
                  </div>
                ))}
            </div>
          </div>

          {customEnvironments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium text-sm text-foreground">Custom Environments</h3>
                <Badge variant="outline" className="text-xs font-normal">
                  {customEnvironments.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {customEnvironments.map((env) => (
                  <div
                    key={`custom-env-${env}`}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-md
                      ${newlyAddedEnvs.includes(env)
                        ? 'bg-primary/10 border border-primary/30 animate-pulse'
                        : 'bg-muted/30 border border-border/50'}
                      hover:bg-muted/50 transition-colors`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getEnvironmentLabel(env)}</span>
                      {newlyAddedEnvs.includes(env) && (
                        <Badge className="bg-primary/20 text-primary text-xs">NEW</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEnvironment(env)}
                      className="h-8 p-0 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            setShowEnvironmentModal(false);
            setNewlyAddedEnvs([]);
          }}
          className="hover:bg-muted transition-colors"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            setShowEnvironmentModal(false);
            setNewlyAddedEnvs([]);
          }}
          className="hover:shadow-md transition-all"
        >
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );

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

  // Enhanced delete confirmation
  const confirmDeleteEndpoint = async () => {
    if (!endpointToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await endpointService.deleteEndpoint(endpointToDelete.id);

      // Stop monitoring if active
      stopMonitoring(endpointToDelete.id);

      // Remove from state
      setEndpoints(prev => prev.filter(e => e.id !== endpointToDelete.id));

      setEndpointToDelete(null);
      toast.success("Endpoint deleted successfully");
    } catch (err) {
      console.error("Error deleting endpoint:", err);
      toast.error("Failed to delete endpoint");
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to handle editing an endpoint
  const handleEditEndpoint = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setIsEditMode(true);
    setShowRegisterModal(true);
  };

  // Function to handle endpoint submission - both create and update
  const handleEndpointSubmit = async (formData: Record<string, any>): Promise<void> => {
    try {
      if (isEditMode && selectedEndpoint) {
        // Handle update
        // Format data for update
        const updateData = {
          name: formData.name,
          url: formData.url,
          method: formData.method,
          service: formData.service,
          environment: formData.environment,
          description: formData.description
        };

        // Call API to update endpoint
        const result = await endpointService.updateEndpoint(selectedEndpoint.id, updateData);

        if (result) {
          const newEndpoint = result.endpoint;
          toast.success("Endpoint updated successfully");

          // Instead of calling fetchEndpoints, update the state directly
          setEndpoints(prevEndpoints => {
            const updatedEndpoints = prevEndpoints.map(ep => {
              if (ep.id === selectedEndpoint.id) {
                return {
                  ...ep,
                  name: formData.name,
                  url: formData.url,
                  service: formData.service,
                  environment: normalizeEnvironment(formData.environment),
                  status: ep.status
                };
              }
              return ep;
            });
            return updatedEndpoints;
          });

          setIsEditMode(false);
          setSelectedEndpoint(null);
          setShowRegisterModal(false);

          // Start monitoring automatically if enabled
          if (newEndpoint && newEndpoint._id && monitoringState[newEndpoint._id]?.isActive) {
            // Ping this endpoint immediately
            try {
              await endpointService.pingEndpoint(newEndpoint._id);
            } catch (error) {
              console.error("Error pinging endpoint:", error);
            }
          }
        }
      } else {
        // Handle create new
        await handleRegisterEndpoint(formData);
        setShowRegisterModal(false);
      }
    } catch (error) {
      console.error("Error submitting endpoint:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred submitting the endpoint";
      toast.error(errorMessage);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Endpoints</h1>
            <p className="text-muted-foreground mt-2">
              Monitor and manage your API endpoints
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowEnvironmentModal(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Manage Environments
            </Button>
            <Button onClick={() => setShowRegisterModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Endpoint
            </Button>
          </div>
        </div>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-border/60">
          <CardHeader className="bg-muted/30 rounded-t-lg pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="h-5 w-5 text-primary" />
              Filters
            </CardTitle>
            <CardDescription>Filter endpoints by service, environment, or search by content</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="Search endpoints..."
                    onChange={handleSearchChange}
                    className="pl-9 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                    defaultValue={filters.search}
                  />
                  {filters.search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1.5 h-7 w-7 opacity-70 hover:opacity-100 transition-opacity"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select
                  value={filters.service}
                  onValueChange={(value) => handleFilterChange('service', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.environment}
                  onValueChange={(value) => handleFilterChange('environment', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    {environments.map((env) => (
                      <SelectItem key={env} value={env}>
                        {getEnvironmentLabel(env)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active filters display */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (value && value !== 'all') {
                    return (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="px-2 py-1 hover:bg-secondary/80"
                      >
                        {key}: {value}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => handleFilterChange(key as keyof typeof filters, 'all')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  }
                  return null;
                })}
                {Object.values(filters).some(value => value && value !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={clearFilters}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-border/60">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEndpoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="rounded-full bg-muted/20 p-4 mb-4">
                  <Slash className="h-8 w-8 text-muted-foreground/70" />
                </div>
                <h3 className="text-lg font-medium">No endpoints found</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Try changing your filters or add a new endpoint
                </p>
                <Button variant="outline" onClick={() => setShowRegisterModal(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Endpoint
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                      Name {sortConfig.key === 'name' && (
                        <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead onClick={() => handleSort('service')} className="cursor-pointer">
                      Service {sortConfig.key === 'service' && (
                        <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead onClick={() => handleSort('environment')} className="cursor-pointer">
                      Environment {sortConfig.key === 'environment' && (
                        <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead onClick={() => handleSort('lastChecked')} className="cursor-pointer">
                      Last Checked {sortConfig.key === 'lastChecked' && (
                        <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEndpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(endpoint.status)}
                          <Badge variant={endpoint.status === "active" ? "secondary" : "destructive"}>
                            {endpoint.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{endpoint.name}</TableCell>
                      <TableCell>{endpoint.service}</TableCell>
                      <TableCell>{endpoint.environment}</TableCell>
                      <TableCell>
                        <a
                          href={endpoint.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:underline text-sm text-muted-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {endpoint.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {endpoint.lastChecked ? (
                                <time dateTime={endpoint.lastChecked.toISOString()} className="text-sm text-muted-foreground">
                                  {formatDate(endpoint.lastChecked)}
                                </time>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not checked yet</span>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{endpoint.lastChecked ? endpoint.lastChecked.toLocaleString() : 'Not checked yet'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (endpoint.id) {
                                toggleMonitoring(endpoint.id, endpoint.url);
                              } else {
                                toast.error("Cannot monitor: Endpoint ID is missing");
                              }
                            }}
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${monitoringState[endpoint.id]?.isActive
                                ? "text-green-500 animate-spin"
                                : "text-muted-foreground"
                                }`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEndpoint(endpoint)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEndpoint(endpoint)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <EndpointModal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          setIsEditMode(false);
          setSelectedEndpoint(null);
        }}
        onSubmit={handleEndpointSubmit}
        initialData={selectedEndpoint || undefined}
      />

      <AlertDialog open={!!endpointToDelete} onOpenChange={() => setEndpointToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Endpoint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {endpointToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEndpoint}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Environment Management Dialog */}
      <Dialog open={showEnvironmentModal} onOpenChange={setShowEnvironmentModal}>
        {environmentDialogContent}
      </Dialog>
    </MainLayout>
  );
}
