"use client";

import { EndpointModal } from "@/components/endpoints/EndpointModal";
import MainLayout from "@/components/layouts/main-layout";
import { formatDate } from "@/lib/utils";
import { endpointService } from "@/services/endpointService";
import { AlertTriangle, Check, ExternalLink, Plus, RefreshCw, Search, Trash2, X, Settings, Filter, AlertCircle, Clock as ClockIcon, Lock, Edit, MoreVertical, PlusCircle, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
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
  const [newEnvironment, setNewEnvironment] = useState("");

  // Function to fetch and format endpoints
  const fetchEndpoints = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Clear success message if it exists
      if (successMessage) {
        setSuccessMessage(null);
      }

      const response = await endpointService.getAllEndpoints();

      // Format endpoint data with normalized environments
      const formattedEndpoints = response.map((endpoint: any) => ({
        ...endpoint,
        environment: normalizeEnvironment(endpoint.environment),
        status: endpoint.status || "active",
      }));

      setEndpoints(formattedEndpoints);

      // Extract unique environments and services from endpoints
      const uniqueEnvironments = [...new Set(formattedEndpoints.map(e => e.environment))]
        .filter(Boolean)
        .sort();

      const uniqueServices = [...new Set(formattedEndpoints.map(e => e.service))]
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
  }, [successMessage]);

  // Ping a single endpoint
  const pingEndpoint = async (id: string, url: string) => {
    try {
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
      endpoints.map(endpoint => pingEndpoint(endpoint.id, endpoint.url))
    );
    return results.every(result => result);
  };

  // Start monitoring the endpoints
  const startMonitoring = useCallback(() => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }

    // Set active state for all endpoints
    setMonitoringState(prev => {
      const newState = { ...prev };
      endpoints.forEach(endpoint => {
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
  }, [endpoints, monitoringInterval]);

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
  const toggleMonitoring = (id: string, url: string) => {
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
      const hasActiveEndpoints = Object.values(monitoringState).some(state => state.isActive);
      if (hasActiveEndpoints) {
        startMonitoring();
      }
    }
  }, [endpoints, startMonitoring]);

  // Initial fetch of endpoints
  useEffect(() => {
    fetchEndpoints();

    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchEndpoints();
    }, 30000); // Refresh every 30 seconds

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchEndpoints]);

  // Update the endpoints array when filters change
  useEffect(() => {
    fetchEndpoints();
  }, [filters, searchQuery, fetchEndpoints]);

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
          startMonitoring();
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
          fetchEndpoints();  // Refresh the list
          setIsEditMode(false);
          setSelectedEndpoint(null);
          setShowRegisterModal(false);

          // Start monitoring automatically if enabled
          if (newEndpoint && newEndpoint._id && monitoringState[newEndpoint._id]?.isActive) {
            // Ping this endpoint immediately
            pingEndpoint(newEndpoint._id, newEndpoint.url);
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

  // Update handleAddEnvironment to use our hook function
  const handleAddEnvironment = () => {
    if (!newEnvironment.trim()) return;
    addEnvironment(newEnvironment);
    setNewEnvironment("");
    toast.success(`Added new environment: ${getEnvironmentLabel(newEnvironment)}`);
  };

  // Update handleRemoveEnvironment to use our hook function
  const handleRemoveEnvironment = (env: string) => {
    try {
      removeEnvironment(env);
      toast.success(`Removed environment: ${getEnvironmentLabel(env)}`);
    } catch (error) {
      toast.error("Failed to remove environment");
    }
  };

  // Get all distinct environments from endpoints and add standard ones
  const uniqueEnvironments = Array.from(new Set([
    ...environments,
    ...(sortedEndpoints.map((e: Endpoint) => e.environment?.toLowerCase() || 'production'))
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
          {allEnvironments
            .filter(env => !customEnvironments.includes(env.value))
            .map((env) => (
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
              <span className="text-sm">{getEnvironmentLabel(env)}</span>
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
                  onValueChange={(value) => setFilters({...filters, environment: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Environments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    {environments.map(env => (
                      <SelectItem key={env} value={env}>
                        {getEnvironmentLabel(env)}
                      </SelectItem>
                    ))}
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
