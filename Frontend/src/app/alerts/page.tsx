"use client";

import MainLayout from "@/components/layouts/main-layout";
import { Search, Filter, Bell, AlertCircle, Clock, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  use_tls: boolean;
}

interface Alert {
  _id: string;
  message: string;
  service_name: string;
  environment: string;
  level: string;
  status: string;
  timestamp: string;
  acknowledged: boolean;
  description?: string;
  remediation?: string;
}

interface FormattedAlert {
  id: string;
  title: string;
  service: string;
  environment: string;
  severity: string;
  status: string;
  timestamp: Date;
  acknowledged: boolean;
  description?: string;
  remediation?: string;
}

export default function AlertsPage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    use_tls: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [alerts, setAlerts] = useState<FormattedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [error, setError] = useState(null);

  // Load existing SMTP configuration
  useEffect(() => {
    async function loadSMTPConfig() {
      try {
        const config = await api.settings.getSMTP();
        setSmtpConfig(config);
      } catch (error) {
        console.error("Failed to load SMTP configuration:", error);
      }
    }
    loadSMTPConfig();
  }, []);

  async function handleSMTPSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const configToSubmit = {
        ...smtpConfig,
        port: parseInt(smtpConfig.port.toString(), 10), // Ensure port is a number
      };
      await api.settings.updateSMTP(configToSubmit);
      toast.success("SMTP configuration updated successfully");
      setIsConfigOpen(false);
    } catch (error) {
      console.error("Failed to update SMTP configuration:", error);
      toast.error("Failed to update SMTP configuration");
    } finally {
      setIsSaving(false);
    }
  }

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSmtpConfig(prev => ({
      ...prev,
      port: isNaN(value) ? 587 : value // Use default port 587 if invalid
    }));
  };

  useEffect(() => {
    async function fetchAlerts() {
      setIsLoading(true);
      try {
        const alertsData = await api.alerts.getAll();

        // Transform backend data to match frontend structure
        const formattedAlerts = alertsData.map((alert: Alert): FormattedAlert => ({
          id: alert._id,
          title: alert.message,
          service: alert.service_name,
          environment: alert.environment,
          severity: alert.level,
          status: alert.status,
          timestamp: new Date(alert.timestamp),
          acknowledged: alert.acknowledged,
          description: alert.description,
          remediation: alert.remediation
        }));

        setAlerts(formattedAlerts);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
        toast.error("Failed to fetch alerts");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  // Function to get severity badge color
  const getSeverityColor = (severity: string | undefined | null) => {
    if (!severity) {
      return "bg-muted text-muted-foreground";
    }

    switch (severity.toLowerCase()) {
      case "critical":
      case "error":
      case "fatal":
        return "bg-destructive text-destructive-foreground";
      case "warning":
      case "warn":
        return "bg-yellow-500 text-white";
      case "info":
        return "bg-blue-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Function to get status badge color
  const getStatusColor = (status: string | undefined | null) => {
    if (!status) {
      return "bg-muted text-muted-foreground";
    }

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
            <button
              onClick={() => setIsConfigOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              <Bell className="mr-2 h-4 w-4" />
              Configure Notifications
            </button>
          </div>
        </div>

        {/* Notification Configuration Dialog */}
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Configure Notifications</DialogTitle>
              <DialogDescription>
                Set up SMTP settings for email notifications. These settings will be used to send alert notifications.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSMTPSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host</Label>
                  <Input
                    id="host"
                    placeholder="smtp.example.com"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">SMTP Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={smtpConfig.port}
                    onChange={handlePortChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username@example.com"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={smtpConfig.password}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_email">From Email</Label>
                  <Input
                    id="from_email"
                    placeholder="notifications@example.com"
                    value={smtpConfig.from_email}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="use_tls" className="block mb-2">Use TLS</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use_tls"
                      checked={smtpConfig.use_tls}
                      onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, use_tls: checked })}
                    />
                    <Label htmlFor="use_tls">Enable TLS encryption</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfigOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

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
