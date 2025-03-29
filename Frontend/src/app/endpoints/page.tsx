"use client";

import MainLayout from "@/components/layouts/main-layout";
import { Plus, Search, ExternalLink, Check, AlertTriangle, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    service: "",
    environment: ""
  });

  useEffect(() => {
    async function fetchEndpoints() {
      try {
        setIsLoading(true);
        const endpointsData = await api.endpoints.getAll();

        // Transform backend data to match frontend structure
        const formattedEndpoints = endpointsData.map(endpoint => ({
          id: endpoint._id,
          name: endpoint.name || `${endpoint.service} Endpoint`,
          url: endpoint.url,
          status: endpoint.status || "healthy",
          lastChecked: new Date(endpoint.last_checked || Date.now()),
          service: endpoint.service,
          environment: endpoint.environment || "production",
          headers: endpoint.headers || { "Content-Type": "application/json" },
          transformationEnabled: endpoint.transformation_enabled || false
        }));

        // Apply filters if any
        let filteredEndpoints = formattedEndpoints;
        if (filters.service) {
          filteredEndpoints = filteredEndpoints.filter(e => e.service === filters.service);
        }
        if (filters.environment) {
          filteredEndpoints = filteredEndpoints.filter(e => e.environment === filters.environment);
        }

        setEndpoints(filteredEndpoints);
      } catch (err) {
        console.error("Error fetching endpoints:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEndpoints();
  }, [filters]);

  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy":
        return <Check className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <X className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">External Endpoints</h1>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
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

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            Error loading endpoints: {error}
          </div>
        )}

        {/* Endpoints List */}
        <div className="rounded-md border">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">URL</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Service</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Environment</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Last Checked</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">Loading endpoints...</td>
                  </tr>
                ) : endpoints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">No endpoints found</td>
                  </tr>
                ) : (
                  endpoints.map((endpoint) => (
                  <tr
                    key={endpoint.id}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle font-medium">{endpoint.name}</td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center">
                        <span className="truncate max-w-[200px]">{endpoint.url}</span>
                        <a
                          href={endpoint.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                    <td className="p-4 align-middle">{endpoint.service}</td>
                    <td className="p-4 align-middle">{endpoint.environment}</td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(endpoint.status)}
                        <span
                          className={`capitalize ${endpoint.status === "error" ? "text-destructive" : endpoint.status === "warning" ? "text-yellow-500" : "text-green-500"}`}
                        >
                          {endpoint.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">{formatDate(endpoint.lastChecked)}</td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                          <span className="sr-only">Edit</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                            <path d="m15 5 4 4"></path>
                          </svg>
                        </button>
                        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                          <span className="sr-only">Test</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24
