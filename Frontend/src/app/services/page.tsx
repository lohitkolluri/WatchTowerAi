"use client";

import MainLayout from "@/components/layouts/main-layout";
import { ServiceModal, ServiceFormData } from "@/components/services/ServiceModal";
import { Plus, Search, Filter, AlertTriangle, RefreshCw, X, Settings, Activity, Bell, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [endpoints, setEndpoints] = useState([]);

  // Function to fetch services
  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.services.getAll();
      const responseData = Array.isArray(response) ? response : (response?.data || []);

      const fetchedServices: Service[] = responseData.map((service: any) => ({
        id: service._id || service.id,
        name: service.name,
        environment: service.environment,
        alertRules: service.alertRules,
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
      }));

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

      setServices(filteredServices);
    } catch (err: unknown) {
      console.error("Error fetching services:", err);
      toast.error(err instanceof Error ? err.message : "Failed to fetch services");
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [searchQuery, environmentFilter, statusFilter]);

  // Function to handle service registration
  const handleRegisterService = async (formData: ServiceFormData) => {
    try {
      const serviceData = {
        name: formData.name,
        environment: formData.environment,
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

  // Function to fetch endpoints and auto-configure services
  const autoConfigureServices = async () => {
    try {
      setIsAutoConfiguring(true);

      // Fetch all endpoints
      const endpointsResponse = await api.endpoints.getAll();
      console.log('Endpoints response:', endpointsResponse); // Debug log

      const fetchedEndpoints = Array.isArray(endpointsResponse) ? endpointsResponse :
                             endpointsResponse?.data || endpointsResponse?.endpoints || [];
      setEndpoints(fetchedEndpoints);

      // Get existing services
      const existingServices = await api.services.getAll();
      const existingServiceMap = new Map(
        existingServices.map((s: Service) => [s.name, s])
      );

      // Register or update services from endpoints
      for (const endpoint of fetchedEndpoints) {
        console.log('Processing endpoint:', endpoint); // Debug log

        const serviceData = {
          name: endpoint.name,
          environment: endpoint.environment || "Production",
          alertRules: endpoint.alertRules || "Default",
          notificationChannels: endpoint.notificationChannels || ["email"],
          status: "Active",
          endpoint: {
            url: endpoint.url,
            method: endpoint.method || "GET",
            headers: endpoint.headers || {},
            timeout: endpoint.timeout || 5000,
          }
        };

        const existingService = existingServiceMap.get(endpoint.name);

        try {
          if (existingService) {
            // Update existing service if environment or other properties have changed
            if (existingService.environment !== endpoint.environment ||
                existingService.endpoint?.url !== endpoint.url ||
                existingService.endpoint?.method !== endpoint.method) {

              console.log('Updating service:', endpoint.name, 'with new data:', serviceData); // Debug log
              await api.services.update(existingService.id, serviceData);
              toast.success(`Service "${endpoint.name}" was updated with new configuration`);
            }
          } else {
            // Create new service
            console.log('Creating new service:', serviceData); // Debug log
            await api.services.create(serviceData);
            toast.success(`Service "${endpoint.name}" was automatically configured`);
          }
        } catch (err) {
          console.error(`Error configuring service for endpoint ${endpoint.name}:`, err);
          toast.error(`Failed to configure service for endpoint ${endpoint.name}`);
        }
      }

      // Refresh services list
      fetchServices();
    } catch (err) {
      console.error("Error in auto-configuration:", err);
      toast.error("Failed to auto-configure services from endpoints");
    } finally {
      setIsAutoConfiguring(false);
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
      Active: "success",
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Services</h1>
            <p className="text-muted-foreground mt-2">
              Manage and monitor your services
            </p>
          </div>
          <Button onClick={() => setShowRegisterModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter services by environment, status, or search by name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Select
                  value={environmentFilter}
                  onValueChange={setEnvironmentFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Staging">Staging</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : services.length === 0 ? (
            <Card className="col-span-full p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">No services found</h3>
                <p className="text-muted-foreground mt-2">
                  {error || "Add your first service to start monitoring"}
                </p>
                {!error && (
                  <Button
                    onClick={() => setShowRegisterModal(true)}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            services.map((service) => (
              <Card key={service.id} className="relative group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {service.name}
                        {getStatusBadge(service.status)}
                      </CardTitle>
                      <CardDescription>
                        Environment: {service.environment}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Activity className="mr-2 h-4 w-4" />
                          View Metrics
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Bell className="mr-2 h-4 w-4" />
                          Configure Alerts
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setServiceToDelete(service)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Service
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Alert Rules</h4>
                      <p className="text-sm text-muted-foreground">
                        {service.alertRules || "No alert rules configured"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Notification Channels</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.notificationChannels.length > 0 ? (
                          service.notificationChannels.map((channel) => (
                            <Badge key={channel} variant="outline">
                              {channel}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No notification channels configured
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ServiceModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSubmit={handleRegisterService}
      />

      <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {serviceToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
