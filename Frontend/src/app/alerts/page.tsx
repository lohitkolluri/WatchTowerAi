"use client";

import MainLayout from "@/components/layouts/main-layout";
import { Search, Filter, Bell, AlertCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    service: "",
    status: "",
    environment: "",
    severity: ""
  });

  useEffect(() => {
    async function fetchAlerts() {
      try {
        setIsLoading(true);
        const alertsData = await api.alerts.getAll(filters);

        // Transform backend data to match frontend structure
        const formattedAlerts = alertsData.map(alert => ({
          id: alert._id,
          title: alert.message,
          service: alert.service_name,
          environment: alert.environment,
          severity: alert.level.toLowerCase(),
          status: alert.acknowledged ? "acknowledged" : "active",
          timestamp: new Date(alert.timestamp),
          description: alert.message,
          remediation: alert.remediation || "No remediation steps provided."
        }));

        setAlerts(formattedAlerts);
      } catch (err) {
        console.error("Error fetching alerts:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAlerts();
  }, [filters]);

  // Function to get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "warning":
        return "bg-yellow-500 text-white";
      case "info":
        return "bg-blue-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-destructive text-destructive-foreground";
      case "acknowledged":
        return "bg-yellow-500 text-white";
      case "resolved":
        return "bg-green-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Bell className="mr-2 h-4 w-4" />
              Configure Notifications
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search alerts..."
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All Services</option>
              <option value="auth">Auth</option>
              <option value="api">API</option>
              <option value="billing">Billing</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="gateway">Gateway</option>
            </select>
          </div>
          <div>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters (Collapsed by default) */}
        <div className="rounded-md border border-border p-4">
          <button className="flex items-center text-sm font-medium">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </button>
          <div className="hidden mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Environment</label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">All Environments</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Severity</label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <div className="flex items-center mt-1 gap-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
                  />
                </div>
                <span>to</span>
                <div className="relative flex-1">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            Error loading alerts: {error}
          </div>
        )}

        {/* Alerts List */}
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="text-lg text-muted-foreground">Loading alerts...</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="text-lg text-muted-foreground">No alerts found</div>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
              >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle
                        className={`h-5 w-5 ${alert.severity === "critical" ? "text-destructive" : alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"}`}
                      />
                      <h3 className="text-lg font-semibold">{alert.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{alert.service}</span>
                      <span>•</span>
                      <span>{alert.environment}</span>
                      <span>•</span>
                      <span>{formatDate(alert.timestamp)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm">{alert.description}</p>
                  {alert.remediation && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Remediation:</h4>
                      <div className="text-sm text-muted-foreground markdown-content">
                        <ReactMarkdown>{alert.remediation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
