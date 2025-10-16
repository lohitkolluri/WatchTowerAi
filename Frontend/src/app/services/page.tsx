"use client";

import MainLayout from "@/components/layouts/main-layout";
import { ServiceModal, ServiceFormData } from "@/components/services/ServiceModal";
import { Plus, Search, Filter, AlertTriangle, RefreshCw, X, Settings, Activity, Bell, Trash2, Loader2, BarChart3 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { serviceService } from "@/services/serviceService";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEnvironments, normalizeEnvironment, getEnvironmentLabel } from "@/lib/environments";
import { DatabaseIcon } from "lucide-react";

// Define TypeScript interfaces for better type safety
interface Service {
  id: string;
  name: string;
  environment: string;
  alertRules: string;
  notificationChannels: string[];
  status: "Active" | "Pending" | "Disabled";
  endpoint?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    timeout: number;
    lastChecked?: Date;
    healthStatus?: string;
  };
  metrics?: any;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [availableEnvironments, setAvailableEnvironments] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const REFRESH_INTERVAL = 30000; // 30 seconds

  // Function to fetch services
  const fetchServices = useCallback(async (isManualRefresh = false) => {
    try {
      isManualRefresh ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      // Fetch both services and endpoints in parallel
      const [servicesResponse, endpointsResponse] = await Promise.all([
        api.services.getAll(),
        api.endpoints.getAll()
      ]);

      const responseData = Array.isArray(servicesResponse) ? servicesResponse : [];
      const endpoints = endpointsResponse || [];

      // Extract environments from both services and endpoints for environment manager
      const extractedEnvironments: string[] = [];

      const fetchedServices: Service[] = responseData.map((service: any) => {
        const env = normalizeEnvironment(service.environment || service.env || "unknown");
        if (env) {
          extractedEnvironments.push(env);
        }
        const name = service.name || service.service_name || service.service || "unknown";
        const stableId = service._id || service.id || `${name}-${env}`;
        return {
          id: stableId,
          name,
          environment: env,
          alertRules: service.alertRules || "default",
          notificationChannels: service.notificationChannels || [],
          status: service.status || "Active",
          endpoint: service.endpoint ? {
            url: service.endpoint.url,
            method: service.endpoint.method,
            headers: service.endpoint.headers || {},
            timeout: service.endpoint.timeout || 5000,
            lastChecked: service.endpoint.lastChecked,
            healthStatus: service.endpoint.healthStatus
          } : undefined,
          metrics: service.metrics
        };
      });

      // Add environments from endpoints
      endpoints.forEach((endpoint: any) => {
        if (endpoint.environment) {
          extractedEnvironments.push(normalizeEnvironment(endpoint.environment));
        }
      });

      // Use uniqueEnvironments directly from our hook instead
      setServices(fetchedServices);

      // Update the filtered services based on current filters
      let filteredServices = fetchedServices;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredServices = filteredServices.filter((service) =>
          service.name.toLowerCase().includes(query) ||
          service.environment.toLowerCase().includes(query) ||
          service.alertRules.toLowerCase().includes(query)
        );
      }

      if (environmentFilter && environmentFilter !== 'all') {
        filteredServices = filteredServices.filter(
          (service) => service.environment === environmentFilter
        );
      }

      if (statusFilter && statusFilter !== 'all') {
        filteredServices = filteredServices.filter(
          (service) => service.status === statusFilter
        );
      }

      setAvailableEnvironments(Array.from(new Set(extractedEnvironments)).sort());

      setServices(filteredServices);
    } catch (err: unknown) {
      console.error("Error fetching services:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch services";
      setError(errorMessage);
      toast.error(errorMessage);
      setServices([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, environmentFilter, statusFilter]);

  // Set up automatic refresh interval
  useEffect(() => {
    fetchServices();
    const intervalId = setInterval(fetchServices, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchServices]);

  // Function to auto-configure services from discovered endpoints
  const autoConfigureServices = async () => {
    try {
      setIsAutoConfiguring(true);
      const endpoints = await api.endpoints.getAll();

      // Filter out endpoints that already have services
      const existingServiceUrls = services.map(s => s.endpoint?.url).filter(Boolean);
      const newEndpoints = endpoints.filter((endpoint: any) =>
        !existingServiceUrls.includes(endpoint.url)
      );

      if (newEndpoints.length === 0) {
        toast.info("No new services to configure");
        return;
      }

      // Create services for new endpoints
      const servicePromises = newEndpoints.map((endpoint: any) => {
        const serviceData = {
          name: endpoint.name || `Service-${endpoint.url.replace(/[^a-zA-Z0-9]/g, '-')}`,
          environment: normalizeEnvironment(endpoint.environment),
          alertRules: "default",
          notificationChannels: [],
          status: "Active",
          endpoint: {
            url: endpoint.url,
            method: endpoint.method || 'GET',
            headers: endpoint.headers || {},
            timeout: endpoint.timeout || 5000
          }
        };
        return api.services.create(serviceData);
      });

      await Promise.all(servicePromises);
      toast.success(`${newEndpoints.length} new service(s) configured`);
      fetchServices();
    } catch (err: unknown) {
      console.error("Error auto-configuring services:", err);
      toast.error(err instanceof Error ? err.message : "Failed to auto-configure services");
    } finally {
      setIsAutoConfiguring(false);
    }
  };

  // Function to handle service registration
  const handleRegisterService = async (formData: ServiceFormData) => {
    try {
      const serviceData = {
        name: formData.name,
        environment: normalizeEnvironment(formData.environment),
        alertRules: formData.alertRules,
        notificationChannels: formData.notificationChannels,
        status: "Active",
        endpoint: formData.endpoint && {
          url: formData.endpoint.url,
          method: formData.endpoint.method,
          headers: formData.endpoint.headers || {},
          timeout: formData.endpoint.timeout || 5000
        }
      };

      await api.services.create(serviceData);
      toast.success(`Service "${formData.name}" was registered successfully`);
      fetchServices();
      setShowRegisterModal(false);

      return Promise.resolve();
    } catch (err: unknown) {
      console.error("Error registering service:", err);
      toast.error(err instanceof Error ? err.message : "Failed to register service");
      return Promise.reject(err);
    }
  };

  // Function to handle service deletion
  const handleDeleteService = async () => {
    if (!serviceToDelete) return;

    setIsDeleting(true);
    try {
      await api.services.delete(serviceToDelete.id);
      toast.success(`Service "${serviceToDelete.name}" was deleted successfully`);
      setServiceToDelete(null);
      fetchServices();
    } catch (err) {
      console.error("Error deleting service:", err);
      toast.error("Failed to delete service");
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to get status badge
  const getStatusBadge = (status: Service["status"]) => {
    const variants = {
      Active: "default",
      Pending: "warning",
      Disabled: "destructive"
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-5 animate-in slide-in-from-top duration-500">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Services
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor your services
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => fetchServices(true)}
              disabled={isRefreshing}
              className="hover:shadow-md transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={() => setShowRegisterModal(true)}
              className="hover:scale-105 transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Register Service
            </Button>
            <Button
              variant="secondary"
              onClick={autoConfigureServices}
              disabled={isAutoConfiguring}
              className="hover:shadow-md transition-all duration-200"
            >
              <Settings className={`mr-2 h-4 w-4 ${isAutoConfiguring ? 'animate-spin' : ''}`} />
              Auto Configure
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive animate-in fade-in-50 slide-in-from-top-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50">
          <CardHeader className="bg-muted/30 rounded-t-lg py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px] border-input/60 shadow-sm hover:border-input h-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full opacity-70 hover:opacity-100"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <Select
                  value={environmentFilter}
                  onValueChange={setEnvironmentFilter}
                >
                  <SelectTrigger className="w-[160px] h-9 border-input/60 shadow-sm hover:border-input">
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    {availableEnvironments.map((env) => (
                      <SelectItem key={env} value={env}>
                        {getEnvironmentLabel(env)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[140px] h-9 border-input/60 shadow-sm hover:border-input">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>

                {(searchQuery || environmentFilter !== "all" || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setEnvironmentFilter("all");
                      setStatusFilter("all");
                    }}
                    className="ml-1 text-xs h-9 px-2"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {isLoading ? (
            // Loading skeletons with subtle animations
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="shadow-sm animate-pulse border border-border/40">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Skeleton className="h-9 w-full rounded-md" />
                </CardFooter>
              </Card>
            ))
          ) : services.length === 0 ? (
            <div className="lg:col-span-3 flex flex-col items-center justify-center p-12 border rounded-xl bg-gradient-to-b from-muted/10 to-transparent animate-in fade-in-50">
              <div className="rounded-full bg-muted/20 p-4 mb-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No services found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery || environmentFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search criteria or clear filters"
                  : "Start by registering a new service or use auto-configuration"}
              </p>
              {(searchQuery || environmentFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setEnvironmentFilter("all");
                    setStatusFilter("all");
                  }}
                  className="mt-2"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            services.map((service, index) => (
              <Card
                key={service.id}
                className="shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in-50 border border-border/60 overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-2 border-b border-border/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex gap-2 items-center">
                        {service.name}
                        <Badge variant={
                          service.status === "Active" ? "default" :
                            service.status === "Pending" ? "outline" :
                              "secondary"
                        } className="ml-1 text-xs">
                          {service.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <DatabaseIcon className="h-3.5 w-3.5" />
                          <span>{getEnvironmentLabel(service.environment)}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted transition-colors">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 animate-in zoom-in-90 duration-100">
                        <DropdownMenuLabel>Service Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer flex items-center hover:bg-muted/50 transition-colors"
                          onClick={() => window.location.href = `/analytics?service=${service.name}`}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Metrics
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer flex items-center hover:bg-muted/50 transition-colors"
                          onClick={() => window.location.href = `/alerts?service=${service.name}`}
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          View Alerts
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer flex items-center text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => setServiceToDelete(service)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Service
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pb-2 pt-3">
                  {service.endpoint && (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="font-medium">Endpoint:</span>{" "}
                        <code className="bg-muted/30 px-1 py-0.5 rounded text-xs font-mono break-all">{service.endpoint.url}</code>
                      </div>
                      {service.endpoint.healthStatus && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Health:</span>
                          <Badge variant={
                            service.endpoint.healthStatus.toLowerCase() === "healthy" ? "default" :
                              service.endpoint.healthStatus.toLowerCase() === "degraded" ? "outline" :
                                "destructive"
                          } className="transition-colors">
                            {service.endpoint.healthStatus}
                          </Badge>
                        </div>
                      )}
                      {service.metrics && (
                        <div className="grid grid-cols-3 gap-2 mt-3 bg-muted/20 p-2 rounded-md">
                          {service.metrics.uptime !== undefined && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Uptime</p>
                              <p className="font-medium">{service.metrics.uptime.toFixed(1)}%</p>
                            </div>
                          )}
                          {service.metrics.responseTime !== undefined && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Response</p>
                              <p className="font-medium">{service.metrics.responseTime.toFixed(0)} ms</p>
                            </div>
                          )}
                          {service.metrics.errorRate !== undefined && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Error Rate</p>
                              <p className="font-medium">{service.metrics.errorRate.toFixed(1)}%</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 pb-3">
                  <Button
                    variant="outline"
                    className="w-full hover:bg-primary/5 transition-all duration-150"
                    onClick={() => window.location.href = `/analytics?service=${service.name}`}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>

      <ServiceModal
        isOpen={showRegisterModal}
        onOpenChange={setShowRegisterModal}
        onSubmit={handleRegisterService}
        availableEnvironments={availableEnvironments}
      />

      <AlertDialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
        <AlertDialogContent className="animate-in fade-in-50 slide-in-from-top-5 duration-300">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the service
              {serviceToDelete?.name ? ` "${serviceToDelete.name}"` : ""} and remove all associated alerts and monitoring.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:shadow-sm transition-all duration-150">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md transition-all duration-150"
              onClick={handleDeleteService}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
