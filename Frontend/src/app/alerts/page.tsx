"use client";

import MainLayout from "@/components/layouts/main-layout";
import { Search, Filter, Bell, AlertCircle, Clock, X, CheckCircle, AlertTriangle, Info, ArrowUpDown, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface AlertFilters {
  search: string;
  service: string;
  environment: string;
  severity: string;
  status: string;
}

const SEVERITY_ICONS = {
  critical: { icon: AlertCircle, color: "text-destructive" },
  error: { icon: AlertCircle, color: "text-destructive" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  info: { icon: Info, color: "text-blue-500" },
};

const STATUS_BADGES = {
  active: { label: "Active", color: "bg-destructive text-destructive-foreground" },
  acknowledged: { label: "Acknowledged", color: "bg-yellow-500 text-white" },
  resolved: { label: "Resolved", color: "bg-green-500 text-white" },
  default: { label: "Unknown", color: "bg-muted text-muted-foreground" }
};

export default function AlertsPage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<FormattedAlert | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: "",
    port: 587,
    username: "",
    password: "",
    from_email: "",
    use_tls: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [alerts, setAlerts] = useState<FormattedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [filters, setFilters] = useState<AlertFilters>({
    search: "",
    service: "all",
    environment: "all",
    severity: "all",
    status: "all",
  });

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const alertsData = await api.alerts.getAll();
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
        remediation: alert.remediation,
      }));

      setAlerts(formattedAlerts);

      // Extract unique services and environments with proper typing
      const uniqueServices = [...new Set(formattedAlerts.map((alert: FormattedAlert) => alert.service))] as string[];
      const uniqueEnvironments = [...new Set(formattedAlerts.map((alert: FormattedAlert) => alert.environment))] as string[];
      setServices(uniqueServices);
      setEnvironments(uniqueEnvironments);

      setError(null);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
      toast.error("Failed to fetch alerts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    // Set up auto-refresh
    let intervalId: NodeJS.Timeout;
    if (isAutoRefresh) {
      intervalId = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchAlerts, isAutoRefresh]);

  // Load SMTP configuration
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

  const handleSMTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const configToSubmit = {
        ...smtpConfig,
        port: parseInt(smtpConfig.port.toString(), 10),
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
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.alerts.acknowledge(alertId);
      toast.success("Alert acknowledged");
      fetchAlerts(); // Refresh alerts
      } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      toast.error("Failed to acknowledge alert");
    }
  };

  const getSeverityIcon = (severity: string) => {
    const config = SEVERITY_ICONS[severity.toLowerCase() as keyof typeof SEVERITY_ICONS];
    if (!config) return null;

    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = filters.search
      ? alert.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        alert.service.toLowerCase().includes(filters.search.toLowerCase()) ||
        alert.environment.toLowerCase().includes(filters.search.toLowerCase())
      : true;

    const matchesService = filters.service === "all" || alert.service === filters.service;
    const matchesEnvironment = filters.environment === "all" || alert.environment === filters.environment;
    const matchesSeverity = filters.severity === "all" || alert.severity.toLowerCase() === filters.severity.toLowerCase();
    const matchesStatus = filters.status === "all" || alert.status.toLowerCase() === filters.status.toLowerCase();

    return matchesSearch && matchesService && matchesEnvironment && matchesSeverity && matchesStatus;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="text-muted-foreground mt-1">Monitor and manage system alerts</p>
          </div>
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
                    <Label htmlFor="auto-refresh">Auto Refresh</Label>
                    <Switch
                      id="auto-refresh"
                      checked={isAutoRefresh}
                      onCheckedChange={setIsAutoRefresh}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Automatically refresh alerts every 30 seconds</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              onClick={() => setIsConfigOpen(true)}
            >
              <Bell className="mr-2 h-4 w-4" />
              Configure Notifications
            </Button>
            <Button
              variant="outline"
              onClick={fetchAlerts}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter alerts by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search alerts..."
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={filters.service}
                  onValueChange={(value) => setFilters({ ...filters, service: value })}
                >
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select
                  value={filters.environment}
                  onValueChange={(value) => setFilters({ ...filters, environment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    {environments.map((env) => (
                      <SelectItem key={env} value={env}>
                        {env}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_BADGES).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        {error ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex justify-center items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading alerts...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Bell className="h-8 w-8" />
                        <p>No alerts found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(alert.severity)}
                          <span className="capitalize text-sm">{alert.severity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="p-0 h-auto font-normal text-left hover:underline"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          {alert.title}
                        </Button>
                      </TableCell>
                      <TableCell>{alert.service}</TableCell>
                      <TableCell>{alert.environment}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGES[
                            (alert.status?.toLowerCase() || 'default') as keyof typeof STATUS_BADGES
                          ]?.color || STATUS_BADGES.default.color
                        }`}>
                          {STATUS_BADGES[
                            (alert.status?.toLowerCase() || 'default') as keyof typeof STATUS_BADGES
                          ]?.label || alert.status || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <time dateTime={alert.timestamp.toISOString()} className="text-sm text-muted-foreground">
                                {formatDate(alert.timestamp)}
                              </time>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{alert.timestamp.toLocaleString()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* SMTP Configuration Dialog */}
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Email Notification Settings</DialogTitle>
              <DialogDescription>
                Configure SMTP settings for email notifications
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSMTPSubmit} className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host</Label>
                  <Input
                    id="host"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="use_tls">Use TLS</Label>
                    <Switch
                      id="use_tls"
                      checked={smtpConfig.use_tls}
                      onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, use_tls: checked })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                    placeholder="username@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={smtpConfig.password}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_email">From Email</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={smtpConfig.from_email}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                    placeholder="alerts@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Alert Details Dialog */}
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Alert Details</DialogTitle>
            </DialogHeader>
            {selectedAlert && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Severity</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getSeverityIcon(selectedAlert.severity)}
                      <span className="capitalize">{selectedAlert.severity}</span>
                    </div>
          </div>
          <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BADGES[
                          (selectedAlert.status?.toLowerCase() || 'default') as keyof typeof STATUS_BADGES
                        ]?.color || STATUS_BADGES.default.color
                      }`}>
                        {STATUS_BADGES[
                          (selectedAlert.status?.toLowerCase() || 'default') as keyof typeof STATUS_BADGES
                        ]?.label || selectedAlert.status || 'Unknown'}
          </div>
          </div>
        </div>
            <div>
                    <Label>Service</Label>
                    <div className="mt-1">{selectedAlert.service}</div>
            </div>
            <div>
                    <Label>Environment</Label>
                    <div className="mt-1">{selectedAlert.environment}</div>
            </div>
            <div>
                    <Label>Time</Label>
                    <div className="mt-1 font-mono text-sm">
                      {selectedAlert.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Label>Acknowledged</Label>
                    <div className="mt-1">
                      {selectedAlert.acknowledged ? (
                        <span className="text-green-500">Yes</span>
                      ) : (
                        <span className="text-yellow-500">No</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Message</Label>
                  <div className="mt-1 p-4 rounded-lg bg-muted">
                    {selectedAlert.title}
                  </div>
                </div>
                {selectedAlert.description && (
                  <div>
                    <Label>Description</Label>
                    <div className="mt-1 p-4 rounded-lg bg-muted prose prose-sm max-w-none">
                      <ReactMarkdown>{selectedAlert.description}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                {selectedAlert.remediation && (
                  <div>
                    <Label>Remediation Steps</Label>
                    <div className="mt-1 p-4 rounded-lg bg-muted prose prose-sm max-w-none">
                      <ReactMarkdown>{selectedAlert.remediation}</ReactMarkdown>
                </div>
              </div>
                )}
                {!selectedAlert.acknowledged && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleAcknowledge(selectedAlert.id)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Acknowledge Alert
                    </Button>
              </div>
                )}
          </div>
        )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
