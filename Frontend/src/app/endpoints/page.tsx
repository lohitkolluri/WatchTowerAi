"use client";

import { EndpointModal } from "@/components/endpoints/EndpointModal";
import MainLayout from "@/components/layouts/main-layout";
import { formatDate } from "@/lib/utils";
import { endpointService } from "@/services/endpointService";
import { AlertTriangle, Check, ExternalLink, Plus, RefreshCw, Search, Trash2, X, Settings, Filter, AlertCircle, Clock as ClockIcon, Lock, Edit, MoreVertical, PlusCircle, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
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
    hasError: boolean;
  };
}

// Load initial monitoring state from localStorage
const loadMonitoringState = () => {
  if (typeof window === 'undefined') return {};
  const saved = localStorage.getItem('monitoringState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Convert the saved state to match our MonitoringState interface
      const state: MonitoringState = {};
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
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [monitoringState, setMonitoringState] = useState<MonitoringState>(loadMonitoringState());
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    environment: "all",
    service: "all",
    status: "all"
  });
  const [environments, setEnvironments] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Endpoint;
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [newEnvironment, setNewEnvironment] = useState("");
  const [customEnvironments, setCustomEnvironments] = useState<string[]>([]);

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

  // Restart monitoring for previously active endpoints when component mounts
  useEffect(() => {
    Object.entries(monitoringState).forEach(([id, state]) => {
      if (state.isActive) {
        const endpoint = endpoints.find(e => e.id === id);
        if (endpoint) {
          startMonitoring(id, endpoint.url);
        }
      }
    });
  }, [endpoints.length]); // Only run when endpoints are loaded

  // Update the endpoints array when filters change
  useEffect(() => {
    fetchEndpoints();
  }, [filters, searchQuery, customEnvironments]); // Add customEnvironments as a dependency

  // Function to fetch and format endpoints
  const fetchEndpoints = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await endpointService.getAllEndpoints();

      if (!response) {
        setEndpoints([]);
        setError("No data received from server");
        return;
      }

      const endpointsData = response;

      const formattedEndpoints = endpointsData.map((endpoint: EndpointBackendData) => ({
        id: endpoint._id,
        name: endpoint.name || `${endpoint.service || 'Unnamed'} API`,
        url: endpoint.url,
        status: endpoint.status || "active",
        service: endpoint.service || "Unknown",
        environment: endpoint.environment || "production",
        lastChecked: endpoint.last_checked ? new Date(endpoint.last_checked) : new Date()
      }));

      // Update endpoint status based on monitoring state
      const updatedEndpoints = formattedEndpoints.map((endpoint: Endpoint) => {
        const monitoring = monitoringState[endpoint.id];
        if (monitoring) {
          return {
            ...endpoint,
            status: monitoring.isActive ? (monitoring.hasError ? 'error' : 'active') : 'inactive'
          };
        }
        return endpoint;
      });

      // Create a list of unique environments that combines standard, custom, and endpoint environments
      const uniqueEnvironments = Array.from(new Set([
        ...standardEnvValues,
        ...customEnvironments,
        ...updatedEndpoints.map((e: Endpoint) => e.environment?.toLowerCase() || 'production')
      ]));

      const uniqueServices = Array.from(new Set(updatedEndpoints.map((e: Endpoint) => e.service))) as string[];
      setEnvironments(uniqueEnvironments as string[]);
      setServices(uniqueServices);

      // Apply filters
      let filteredEndpoints = updatedEndpoints;
      if (filters.environment && filters.environment !== 'all') {
        filteredEndpoints = filteredEndpoints.filter((e: Endpoint) => e.environment === filters.environment);
      }
      if (filters.service && filters.service !== 'all') {
        filteredEndpoints = filteredEndpoints.filter((e: Endpoint) => e.service === filters.service);
      }
      if (filters.status && filters.status !== 'all') {
        filteredEndpoints = filteredEndpoints.filter((e: Endpoint) => e.status === filters.status);
      }
      if (searchQuery) {
        filteredEndpoints = filteredEndpoints.filter((e: Endpoint) => {
          const query = searchQuery.toLowerCase();
          return (
            e.url.toLowerCase().includes(query) ||
            (e.service?.toLowerCase() || '').includes(query) ||
            (e.environment?.toLowerCase() || '').includes(query)
          );
        });
      }

      setEndpoints(filteredEndpoints);
    } catch (err: unknown) {
      console.error("Error fetching endpoints:", err);
      toast.error(err instanceof Error ? err.message : "Failed to fetch endpoints");
      setEndpoints([]);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, [searchQuery, monitoringState]); // Add monitoringState as a dependency

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

      // Refresh the endpoints list
      await fetchEndpoints();

      // Close the modal
      setShowRegisterModal(false);

      // Start monitoring the new endpoint after a short delay to ensure registration is complete
      if (newEndpoint && newEndpoint.endpoint && newEndpoint.endpoint._id) {
        setTimeout(() => {
          startMonitoring(newEndpoint.endpoint._id, newEndpoint.endpoint.url);
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

  // Function to send a request to an endpoint to generate logs
  const pingEndpoint = async (id: string, url: string) => {
    try {
      // Make an API call to our own service to ping the endpoint
      const result = await endpointService.pingEndpoint(id);
      console.log(`Successfully pinged endpoint ${id}:`, result);

      // Update the endpoint's status in the UI
      setEndpoints(prevEndpoints =>
        prevEndpoints.map(endpoint => {
          if (endpoint.id === id) {
            return {
              ...endpoint,
              lastChecked: new Date(),
              status: 'active'
            };
          }
          return endpoint;
        })
      );
    } catch (err) {
      console.error(`Error pinging endpoint ${id}:`, err);
      const errorMessage = err instanceof Error ? err.message : "Failed to ping endpoint";

      // Show error toast only for the first failure
      if (!monitoringState[id]?.hasError) {
        toast.error(errorMessage);
      }

      // Update the endpoint's status in the UI
      setEndpoints(prevEndpoints =>
        prevEndpoints.map(endpoint => {
          if (endpoint.id === id) {
            return {
              ...endpoint,
              lastChecked: new Date(),
              status: 'error'
            };
          }
          return endpoint;
        })
      );

      // Update monitoring state to track error
      setMonitoringState(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          hasError: true
        }
      }));
    }
  };

  // Start monitoring an endpoint
  const startMonitoring = (id: string, url: string) => {
    try {
      // Stop any existing monitoring for this endpoint
      stopMonitoring(id);

      // Ping immediately when starting monitoring
      pingEndpoint(id, url);

      // Create a new interval to ping the endpoint every 30 seconds
      const intervalId = setInterval(() => {
        pingEndpoint(id, url);
      }, 30000); // 30 seconds

      // Update monitoring state
      setMonitoringState(prev => ({
        ...prev,
        [id]: {
          isActive: true,
          intervalId,
          hasError: false
        }
      }));

      // Show success message
      toast.success("Started monitoring endpoint");
    } catch (error) {
      console.error("Error starting monitoring:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start monitoring";
      toast.error(errorMessage);

      // Update monitoring state
      setMonitoringState(prev => ({
        ...prev,
        [id]: {
          isActive: false,
          intervalId: undefined,
          hasError: true
        }
      }));
    }
  };

  // Stop monitoring an endpoint
  const stopMonitoring = (id: string) => {
    const monitoring = monitoringState[id];
    if (monitoring?.intervalId) {
      clearInterval(monitoring.intervalId);
    }

    setMonitoringState(prev => ({
      ...prev,
      [id]: {
        isActive: false,
        intervalId: undefined,
        hasError: false
      }
    }));
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

  // Enhanced submit handler for both create and edit
  const handleEndpointSubmit = async (formData: Record<string, any>) => {
    try {
      if (isEditMode && selectedEndpoint) {
        // Update existing endpoint
        await endpointService.updateEndpoint(selectedEndpoint.id, formData);
        toast.success("Endpoint updated successfully");
      } else {
        // Create new endpoint
        await handleRegisterEndpoint(formData);
      }

      // Reset state and refresh endpoints
      setIsEditMode(false);
      setSelectedEndpoint(null);
      setShowRegisterModal(false);
      await fetchEndpoints();
    } catch (err) {
      console.error("Error saving endpoint:", err);
      toast.error("Failed to save endpoint");
    }
  };

  // Function to handle sorting
  const handleSort = (key: keyof Endpoint) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort endpoints based on current configuration
  const sortedEndpoints = [...endpoints].sort((a, b) => {
    const aValue = String(a[sortConfig.key] || '');
    const bValue = String(b[sortConfig.key] || '');

    return sortConfig.direction === 'asc'
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Define standard environments with proper capitalization
  const standardEnvironments = [
    { value: 'production', label: 'Production' },
    { value: 'staging', label: 'Staging' },
    { value: 'development', label: 'Development' },
    { value: 'testing', label: 'Testing' },
    { value: 'qa', label: 'QA' }
  ];

  // Standard environment values for comparison
  const standardEnvValues = standardEnvironments.map(env => env.value);

  // Add after other useEffect hooks
  useEffect(() => {
    // Load custom environments from localStorage
    const saved = localStorage.getItem('customEnvironments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomEnvironments(parsed);
        }
      } catch (e) {
        console.error('Error loading custom environments:', e);
      }
    }
  }, []);

  // Add after other functions
  const handleAddEnvironment = () => {
    if (!newEnvironment.trim()) return;

    const environment = newEnvironment.trim().toLowerCase();

    // Check if environment already exists in standard environments
    if (standardEnvValues.includes(environment)) {
      toast.warning(`'${environment}' is already a standard environment`);
      setNewEnvironment("");
      return;
    }

    // Check if it's already in custom environments
    if (customEnvironments.includes(environment)) {
      toast.info(`Environment '${environment}' already exists`);
      setNewEnvironment("");
      return;
    }

    // Add the new environment
    const updatedEnvironments = [...customEnvironments, environment];
    setCustomEnvironments(updatedEnvironments);
    localStorage.setItem('customEnvironments', JSON.stringify(updatedEnvironments));
    toast.success(`Added new environment: ${environment}`);
    setNewEnvironment("");
  };

  const handleRemoveEnvironment = (env: string) => {
    // Prevent removing standard environments
    if (standardEnvValues.includes(env)) {
      toast.error("Cannot remove standard environments");
      return;
    }

    const updatedEnvironments = customEnvironments.filter(e => e !== env);
    setCustomEnvironments(updatedEnvironments);
    localStorage.setItem('customEnvironments', JSON.stringify(updatedEnvironments));
    toast.success(`Removed environment: ${env.charAt(0).toUpperCase() + env.slice(1)}`);
  };

  // Get all distinct environments from endpoints and add standard ones
  const uniqueEnvironments = Array.from(new Set([
    ...standardEnvValues,
    ...customEnvironments,
    ...(sortedEndpoints.map((e: Endpoint) => e.environment?.toLowerCase() || 'production'))
  ])).sort();

  // Format environments for display with proper capitalization
  const formattedEnvironments = uniqueEnvironments.map(env => {
    // Check if it's a standard environment
    const standardEnv = standardEnvironments.find(e => e.value === env);
    if (standardEnv) {
      return standardEnv.label;
    }
    // Otherwise capitalize first letter
    return env.charAt(0).toUpperCase() + env.slice(1);
  });

  // Environment management dialog
  const environmentDialogContent = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Manage Environments</DialogTitle>
        <DialogDescription>
          Add or remove custom environments for your endpoints.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add new environment..."
            value={newEnvironment}
            onChange={(e) => setNewEnvironment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddEnvironment();
              }
            }}
          />
          <Button onClick={handleAddEnvironment} type="button">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
          <div className="font-medium text-sm text-muted-foreground mb-2">Standard Environments</div>
          {standardEnvironments.map((env) => (
            <div key={env.value} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
              <span className="text-sm font-medium">{env.label}</span>
              <Badge variant="outline" className="text-xs">Default</Badge>
            </div>
          ))}

          {customEnvironments.length > 0 && (
            <div className="font-medium text-sm text-muted-foreground mt-4 mb-2">Custom Environments</div>
          )}

          {customEnvironments.map((env) => (
            <div key={env} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30">
              <span className="text-sm">{env.charAt(0).toUpperCase() + env.slice(1)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveEnvironment(env)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button onClick={() => setShowEnvironmentModal(false)}>
          Done
        </Button>
      </DialogFooter>
    </DialogContent>
  );

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

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter endpoints by environment, service, or status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Select
                  value={filters.environment}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, environment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    {environments.map(env => {
                      // Capitalize first letter for display
                      let displayName = env.charAt(0).toUpperCase() + env.slice(1);

                      // If it's a standard environment, use the proper label
                      const standardEnv = standardEnvironments.find(e => e.value === env);
                      if (standardEnv) {
                        displayName = standardEnv.label;
                      }

                      return (
                        <SelectItem key={env} value={env}>{displayName}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select
                  value={filters.service}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, service: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map(service => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading endpoints...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedEndpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ExternalLink className="h-8 w-8" />
                      <p>No endpoints found</p>
                      {!error && (
                        <Button
                          onClick={() => setShowRegisterModal(true)}
                          className="mt-4"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Endpoint
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedEndpoints.map((endpoint) => (
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
                            <time dateTime={endpoint.lastChecked.toISOString()} className="text-sm text-muted-foreground">
                              {formatDate(endpoint.lastChecked)}
                            </time>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{endpoint.lastChecked.toLocaleString()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMonitoring(endpoint.id, endpoint.url)}
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
                ))
              )}
            </TableBody>
          </Table>
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
