"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { getAllEnvironments, normalizeEnvironment } from "@/lib/environments";

interface Endpoint {
  id?: string;
  _id?: string;
  url: string;
  method: string;
  name?: string;
  environment?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ServiceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  initialData?: Partial<ServiceFormData>;
  availableEnvironments: string[];
}

export interface ServiceFormData {
  name: string;
  environment: string;
  alertRules: string;
  notificationChannels: string[];
  endpoint?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
}

export function ServiceModal({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  availableEnvironments
}: ServiceModalProps) {
  // Convert initialData.environment to normalized form
  const normalizedEnvironment = initialData?.environment
    ? normalizeEnvironment(initialData.environment)
    : 'production';

  const [formData, setFormData] = useState<ServiceFormData>({
    name: initialData?.name || "",
    environment: normalizedEnvironment,
    alertRules: initialData?.alertRules || "",
    notificationChannels: initialData?.notificationChannels || ["Email"],
    endpoint: initialData?.endpoint || {
      url: "",
      method: "GET",
      headers: {},
      timeout: 5000
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEndpointConfig, setShowEndpointConfig] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" }
  ]);
  const [availableEndpoints, setAvailableEndpoints] = useState<Endpoint[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>("");

  // Get all available environments including custom and from availableEnvironments prop
  const environments = getAllEnvironments(availableEnvironments);

  // Fetch available endpoints when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEndpoints();
    }
  }, [isOpen]);

  const fetchEndpoints = async () => {
    try {
      setIsLoadingEndpoints(true);
      const endpoints = await api.endpoints.getAll();
      setAvailableEndpoints(endpoints);
    } catch (err) {
      console.error("Error fetching endpoints:", err);
    } finally {
      setIsLoadingEndpoints(false);
    }
  };

  const handleEndpointSelect = (endpointId: string) => {
    setSelectedEndpointId(endpointId);

    if (endpointId === "") {
      // User selected manual configuration
      return;
    }

    const selectedEndpoint = availableEndpoints.find(e => e.id === endpointId || e._id === endpointId);
    if (selectedEndpoint) {
      // If endpoint has a name, use it for service name if name is empty
      if (selectedEndpoint.name && !formData.name) {
        setFormData(prev => ({
          ...prev,
          name: selectedEndpoint.name || ""
        }));
      }

      // If endpoint has environment, use it
      if (selectedEndpoint.environment) {
        setFormData(prev => ({
          ...prev,
          environment: normalizeEnvironment(selectedEndpoint.environment)
        }));
      }

      // Update endpoint details
      setFormData(prev => ({
        ...prev,
        endpoint: {
          url: selectedEndpoint.url,
          method: selectedEndpoint.method || "GET",
          headers: selectedEndpoint.headers || {},
          timeout: selectedEndpoint.timeout || 5000
        }
      }));

      // Update header fields for display
      const headers = selectedEndpoint.headers || {};
      const headerEntries = Object.entries(headers).map(([key, value]) => ({ key, value }));
      setCustomHeaders(headerEntries.length > 0 ? headerEntries : [{ key: "", value: "" }]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (channel: string) => {
    setFormData((prev) => {
      const currentChannels = prev.notificationChannels || [];
      if (currentChannels.includes(channel)) {
        return {
          ...prev,
          notificationChannels: currentChannels.filter((c) => c !== channel),
        };
      } else {
        return {
          ...prev,
          notificationChannels: [...currentChannels, channel],
        };
      }
    });
  };

  const handleEndpointChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      endpoint: {
        ...prev.endpoint!,
        [name]: name === 'timeout' ? parseInt(value) || 5000 : value
      }
    }));
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...customHeaders];
    newHeaders[index][field] = value;

    // Update the endpoint headers in formData
    const headers: Record<string, string> = {};
    newHeaders.forEach(header => {
      if (header.key && header.value) {
        headers[header.key] = header.value;
      }
    });

    setCustomHeaders(newHeaders);
    setFormData(prev => ({
      ...prev,
      endpoint: {
        ...prev.endpoint!,
        headers
      }
    }));
  };

  const addHeaderField = () => {
    setCustomHeaders([...customHeaders, { key: "", value: "" }]);
  };

  const removeHeaderField = (index: number) => {
    const newHeaders = customHeaders.filter((_, i) => i !== index);
    setCustomHeaders(newHeaders);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormSubmitted(true);

    // Validate form
    if (!formData.name.trim()) {
      setError("Service name is required");
      return;
    }

    if (!formData.environment) {
      setError("Environment is required");
      return;
    }

    if (!formData.alertRules.trim()) {
      setError("At least one alert rule is required");
      return;
    }

    if (!formData.notificationChannels.length) {
      setError("At least one notification channel is required");
      return;
    }

    if (showEndpointConfig && (!formData.endpoint?.url || !formData.endpoint?.method)) {
      setError("Endpoint URL and method are required when endpoint configuration is enabled");
      return;
    }

    try {
      setIsSubmitting(true);
      // Make sure environment is normalized before submitting
      const submissionData = {
        ...formData,
        environment: normalizeEnvironment(formData.environment)
      };
      await onSubmit(submissionData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while saving the service");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto shadow-xl border">
        <DialogHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold">
              {initialData ? "Edit Service" : "Register New Service"}
            </DialogTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md relative mb-4">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Service Details Section */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-muted-foreground pb-1 border-b">Service Details</h3>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium flex justify-between">
                <span>Service Name <span className="text-destructive">*</span></span>
                {formSubmitted && !formData.name.trim() && (
                  <span className="text-destructive text-xs">Required field</span>
                )}
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Auth Service, Payment API"
                className={`w-full rounded-md border ${formSubmitted && !formData.name.trim() ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50`}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="environment" className="text-sm font-medium">
                Environment <span className="text-destructive">*</span>
              </label>
              <select
                id="environment"
                name="environment"
                value={formData.environment}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50"
                required
              >
                {environments.map(env => (
                  <option key={env.value} value={env.value}>{env.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="alertRules" className="text-sm font-medium flex justify-between">
                <span>Alert Rules <span className="text-destructive">*</span></span>
                {formSubmitted && !formData.alertRules.trim() && (
                  <span className="text-destructive text-xs">Required field</span>
                )}
              </label>
              <input
                id="alertRules"
                name="alertRules"
                value={formData.alertRules}
                onChange={handleChange}
                placeholder="e.g., Error rate > 5%, CPU usage > 90%"
                className={`w-full rounded-md border ${formSubmitted && !formData.alertRules.trim() ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50`}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Examples: <code className="bg-muted px-1 py-0.5 rounded">Error rate {'>'}  5%</code>, <code className="bg-muted px-1 py-0.5 rounded">Response time {'>'}  1000ms</code>, <code className="bg-muted px-1 py-0.5 rounded">Uptime {'<'} 99.9%</code>
              </p>
            </div>
          </div>

          {/* Notification Settings Section */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-muted-foreground pb-1 border-b">Notification Settings</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between">
                <span>Notification Channels <span className="text-destructive">*</span></span>
                {formSubmitted && formData.notificationChannels.length === 0 && (
                  <span className="text-destructive text-xs">Select at least one channel</span>
                )}
              </label>
              <div className="space-y-3 bg-muted/30 p-3 rounded-md">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="email"
                    checked={formData.notificationChannels.includes("Email")}
                    onChange={() => handleCheckboxChange("Email")}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="email" className="text-sm">
                    Email Notifications
                  </label>
                </div>
                {/* Add future notification channels here */}
              </div>
            </div>
          </div>

          {/* Endpoint Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium text-muted-foreground pb-1">Endpoint Configuration</h3>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="show-endpoint-config"
                  checked={showEndpointConfig}
                  onChange={(e) => setShowEndpointConfig(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="show-endpoint-config" className="text-sm cursor-pointer">
                  Configure Endpoint Details
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="endpoint-select" className="text-sm font-medium">
                Select Existing Endpoint
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="endpoint-select"
                  value={selectedEndpointId}
                  onChange={(e) => handleEndpointSelect(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50"
                  disabled={!showEndpointConfig}
                >
                  <option value="">Manual Configuration</option>
                  {availableEndpoints.map(endpoint => {
                    const id = endpoint.id || endpoint._id || "";
                    return (
                      <option key={id} value={id}>
                        {endpoint.name || endpoint.url} ({endpoint.method})
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={fetchEndpoints}
                  className={`p-2 rounded-md border border-input ${!showEndpointConfig ? 'bg-muted cursor-not-allowed opacity-50' : 'bg-background hover:bg-accent hover:text-accent-foreground'} transition-colors`}
                  disabled={isLoadingEndpoints || !showEndpointConfig}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingEndpoints ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Conditional Endpoint Details Section */}
            {showEndpointConfig && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/10 shadow-sm">
                <div className="space-y-2">
                  <label htmlFor="url" className="text-sm font-medium flex justify-between">
                    <span>Endpoint URL <span className="text-destructive">*</span></span>
                    {formSubmitted && showEndpointConfig && !formData.endpoint?.url && (
                      <span className="text-destructive text-xs">Required field</span>
                    )}
                  </label>
                  <input
                    id="url"
                    name="url"
                    value={formData.endpoint?.url}
                    onChange={handleEndpointChange}
                    placeholder="https://api.example.com/health"
                    className={`w-full rounded-md border ${formSubmitted && showEndpointConfig && !formData.endpoint?.url ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50`}
                    required={showEndpointConfig}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="method" className="text-sm font-medium">
                      HTTP Method <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="method"
                      name="method"
                      value={formData.endpoint?.method}
                      onChange={handleEndpointChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50"
                      required={showEndpointConfig}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="timeout" className="text-sm font-medium">
                      Timeout (ms)
                    </label>
                    <input
                      id="timeout"
                      name="timeout"
                      type="number"
                      value={formData.endpoint?.timeout}
                      onChange={handleEndpointChange}
                      placeholder="5000"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50"
                      min="1000"
                      max="30000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Headers</span>
                    <button
                      type="button"
                      onClick={addHeaderField}
                      className="text-xs bg-muted/50 hover:bg-muted text-primary hover:text-primary/80 px-2 py-1 rounded-md transition-colors"
                    >
                      + Add Header
                    </button>
                  </label>
                  <div className="space-y-2">
                    {customHeaders.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          placeholder="Header name"
                          value={header.key}
                          onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50"
                        />
                        <input
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all hover:border-muted-foreground/50"
                        />
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeHeaderField(index)}
                            className="text-destructive hover:text-destructive/80 transition-colors hover:bg-destructive/10 rounded-md p-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-primary/25"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium
                ${isSubmitting ? 'opacity-80' : 'hover:bg-primary/90 hover:shadow-md'}
                transition-all focus:ring-2 focus:ring-primary/50`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {initialData ? "Updating..." : "Registering..."}
                </span>
              ) : (
                initialData ? "Update Service" : "Register Service"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
