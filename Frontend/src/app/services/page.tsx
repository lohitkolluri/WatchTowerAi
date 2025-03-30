"use client";

import MainLayout from "@/components/layouts/main-layout";
import { ServiceModal, ServiceFormData } from "@/components/services/ServiceModal";
import { Plus, Search, Filter, AlertTriangle, RefreshCw, X } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { serviceService } from "@/services/serviceService";

// Define TypeScript interfaces for better type safety
interface Service {
  id: string;
  name: string;
  environment: string;
  alertRules: string;
  notificationChannels: string[];
  status: "Active" | "Pending" | "Disabled";
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [environmentFilter, setEnvironmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Function to fetch services
  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the API to get services
      const response = await api.services.getAll();

      // Check if response is an array, if not, use an empty array
      const responseData = Array.isArray(response) ? response : (response?.data || []);

      // Transform the response to match our Service interface
      const fetchedServices: Service[] = responseData.map((service: any) => ({
        id: service._id || service.id,
        name: service.name,
        environment: service.environment,
        alertRules: service.alertRules,
        notificationChannels: service.notificationChannels,
        status: service.status || "Active" // Default to Active if status is not provided
      }));

      // Apply search filter if any
      let filteredServices = fetchedServices;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredServices = filteredServices.filter((service) =>
          service.name.toLowerCase().includes(query) ||
          service.environment.toLowerCase().includes(query) ||
          service.alertRules.toLowerCase().includes(query)
        );
      }

      // Apply environment filter if any
      if (environmentFilter) {
        filteredServices = filteredServices.filter(
          (service) => service.environment === environmentFilter
        );
      }

      // Apply status filter if any
      if (statusFilter) {
        filteredServices = filteredServices.filter(
          (service) => service.status === statusFilter
        );
      }

      setServices(filteredServices);
    } catch (err: unknown) {
      console.error("Error fetching services:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
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
      // Call the API to create a new service
      const response = await api.services.create({
        name: formData.name,
        environment: formData.environment,
        alertRules: formData.alertRules,
        notificationChannels: formData.notificationChannels,
        status: "Active"
      });

      // Show success message
      setSuccessMessage(`Service "${formData.name}" was registered successfully`);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

      // Refresh the services list
      fetchServices();

      // Close the modal
      setShowRegisterModal(false);

      return Promise.resolve();
    } catch (err: unknown) {
      console.error("Error registering service:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      return Promise.reject(err);
    }
  };

  // Function to get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <div className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-500">
            Active
          </div>
        );
      case "Pending":
        return (
          <div className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-500">
            Pending
          </div>
        );
      case "Disabled":
        return (
          <div className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-500">
            Disabled
          </div>
        );
      default:
        return (
          <div className="px-3 py-1 text-xs font-medium rounded-full bg-gray-500/10 text-gray-500">
            Unknown
          </div>
        );
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </button>
        </div>

        {/* Filters and Search */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search services..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={environmentFilter}
              onChange={(e) => setEnvironmentFilter(e.target.value)}
            >
              <option value="">All Environments</option>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="Development">Development</option>
            </select>
          </div>
          <div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Services Table */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <p>Loading services...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Error Loading Services</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
              <div className="mt-4">
                <button
                  onClick={() => fetchServices()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </button>
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Services Found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery || environmentFilter || statusFilter
                  ? "No services match your search criteria."
                  : "You haven't registered any services yet."}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Service
                </button>
              </div>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead className="text-xs bg-muted/50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Environment</th>
                    <th scope="col" className="px-6 py-3">Alert Rules</th>
                    <th scope="col" className="px-6 py-3">Notification Channels</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="bg-card border-b hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium">{service.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500">
                          {service.environment}
                        </span>
                      </td>
                      <td className="px-6 py-4">{service.alertRules}</td>
                      <td className="px-6 py-4">
                        {service.notificationChannels.join(", ")}
                      </td>
                      <td className="px-6 py-4">{getStatusIndicator(service.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Service Registration Modal */}
      {showRegisterModal && (
        <ServiceModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSubmit={handleRegisterService}
        />
      )}
    </MainLayout>
  );
}
