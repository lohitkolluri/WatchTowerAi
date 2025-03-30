"use client";

import React from "react";
import MainLayout from "@/components/layouts/main-layout";
import { Search, Filter, Bell, AlertCircle, Clock, X, CheckCircle, AlertTriangle, Info, ArrowUpDown, RefreshCw, Settings } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { normalizeEnvironment, getEnvironmentLabel, useEnvironments } from "@/lib/environments";

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

const SEVERITY_ICONS: {
  [key: string]: {
    icon: React.ForwardRefExoticComponent<any>;
    color: string;
  }
} = {
  critical: { icon: AlertCircle, color: "text-destructive" },
  error: { icon: AlertCircle, color: "text-destructive" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  info: { icon: Info, color: "text-blue-500" },
};

const STATUS_BADGES: {
  [key: string]: {
    label: string;
    color: string;
  }
} = {
  active: { label: "Active", color: "bg-destructive text-destructive-foreground" },
  acknowledged: { label: "Acknowledged", color: "bg-yellow-500 text-white" },
  resolved: { label: "Resolved", color: "bg-green-500 text-white" },
  default: { label: "Unknown", color: "bg-muted text-muted-foreground" }
};

export default function AlertsPage() {
  const { allEnvironments } = useEnvironments();
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

  const formatAlerts = useCallback((alertsData: Alert[]): FormattedAlert[] => {
    return alertsData.map((alert): FormattedAlert => ({
      id: alert._id,
      title: alert.message,
      service: alert.service_name,
      environment: normalizeEnvironment(alert.environment),
      severity: alert.level,
      status: alert.status,
      timestamp: new Date(alert.timestamp),
      acknowledged: alert.acknowledged,
      description: alert.description,
      remediation: alert.remediation,
    }));
  }, []);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const alertsData = await api.alerts.getAll();

      // Check if alertsData and alertsData.data exist
      if (!alertsData || !alertsData.data) {
        console.warn("No alerts data returned from API");
        setAlerts([]);
        setServices([]);
        setEnvironments([]);
        return;
      }

      const formattedAlerts = formatAlerts(alertsData.data);
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
      // Set empty arrays when error occurs
      setAlerts([]);
      setServices([]);
      setEnvironments([]);
    } finally {
      setIsLoading(false);
    }
  }, [formatAlerts]);

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
    if (!severity) return null;
    const config = SEVERITY_ICONS[severity.toLowerCase() as keyof typeof SEVERITY_ICONS];
    if (!config) return null;

    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = filters.search
      ? (alert.title?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
      (alert.service?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
      (alert.environment?.toLowerCase() || '').includes(filters.search.toLowerCase())
      : true;

    const matchesService = filters.service === "all" || alert.service === filters.service;
    const matchesEnvironment = filters.environment === "all" || alert.environment === filters.environment;
    const matchesSeverity = filters.severity === "all" || (alert.severity?.toLowerCase() || '') === filters.severity.toLowerCase();
    const matchesStatus = filters.status === "all" || (alert.status?.toLowerCase() || '') === filters.status.toLowerCase();

    return matchesSearch && matchesService && matchesEnvironment && matchesSeverity && matchesStatus;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-5 animate-in slide-in-from-top duration-500">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and respond to system alerts
            </p>
          </div>
          <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={isAutoRefresh}
                onCheckedChange={setIsAutoRefresh}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                Auto-refresh
              </Label>
            </div>
            <Button
              variant="outline"
              onClick={fetchAlerts}
              disabled={isLoading}
              className="hover:shadow-md transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsConfigOpen(true)}
              className="hover:shadow-md transition-all duration-200"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configure Email Notifications
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
          <CardHeader className="bg-muted/30 rounded-t-lg pb-2">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filters
            </CardTitle>
            <CardDescription>Filter alerts by severity, service, or search by content</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-2">
                <Label htmlFor="alert-search" className="text-sm font-medium">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="alert-search"
                    placeholder="Search alerts..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full pl-8 border-input/60 shadow-sm hover:border-input"
                  />
                  {filters.search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-0 h-full opacity-70 hover:opacity-100"
                      onClick={() => setFilters({ ...filters, search: "" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-filter" className="text-sm font-medium">Service</Label>
                <div className="relative">
                  <Select
                    value={filters.service}
                    onValueChange={(value) => setFilters({ ...filters, service: value })}
                  >
                    <SelectTrigger id="service-filter" className="w-full border-input/60 shadow-sm hover:border-input">
                      <SelectValue placeholder="All Services" />
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
                  {filters.service !== "all" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-8 top-0 h-full opacity-70 hover:opacity-100"
                      onClick={() => setFilters({ ...filters, service: "all" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment-filter" className="text-sm font-medium">Environment</Label>
                <div className="relative">
                  <Select
                    value={filters.environment}
                    onValueChange={(value) => setFilters({ ...filters, environment: value })}
                  >
                    <SelectTrigger id="environment-filter" className="w-full border-input/60 shadow-sm hover:border-input">
                      <SelectValue placeholder="All Environments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Environments</SelectItem>
                      {environments.map((env) => (
                        <SelectItem key={env} value={env}>
                          {getEnvironmentLabel(env)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.environment !== "all" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-8 top-0 h-full opacity-70 hover:opacity-100"
                      onClick={() => setFilters({ ...filters, environment: "all" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity-filter" className="text-sm font-medium">Severity</Label>
                <div className="relative">
                  <Select
                    value={filters.severity}
                    onValueChange={(value) => setFilters({ ...filters, severity: value })}
                  >
                    <SelectTrigger id="severity-filter" className="w-full border-input/60 shadow-sm hover:border-input">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                  {filters.severity !== "all" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-8 top-0 h-full opacity-70 hover:opacity-100"
                      onClick={() => setFilters({ ...filters, severity: "all" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setFilters({
                    search: "",
                    service: "all",
                    environment: "all",
                    severity: "all",
                    status: "all",
                  });
                }}
                className="hover:shadow-md transition-all"
              >
                <X className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50">
          <CardHeader className="bg-muted/30 rounded-t-lg pb-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Active Alerts
            </CardTitle>
            <CardDescription>View and manage system alerts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 animate-pulse">
                    <div className="w-6 h-6 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="flex gap-2">
                        <div className="h-3 bg-muted rounded w-16"></div>
                        <div className="h-3 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                    <div className="w-14 h-6 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="rounded-full bg-muted/20 p-4 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-medium mb-2">No alerts found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {filters.search || filters.service !== "all" || filters.environment !== "all" || filters.severity !== "all" || filters.status !== "all"
                    ? "Try adjusting your search criteria or clear filters"
                    : "All systems are operating normally"}
                </p>
                {(filters.search || filters.service !== "all" || filters.environment !== "all" || filters.severity !== "all" || filters.status !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({
                        search: "",
                        service: "all",
                        environment: "all",
                        severity: "all",
                        status: "all",
                      });
                    }}
                    className="mt-2"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[150px]">Severity</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[150px]">Service</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[180px]">Time</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert, index) => (
                      <TableRow
                        key={alert.id}
                        className={`group hover:bg-muted/30 transition-colors cursor-pointer animate-in fade-in-50 slide-in-from-left-3`}
                        onClick={() => setSelectedAlert(alert)}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {React.createElement(SEVERITY_ICONS[alert.severity]?.icon || AlertCircle, {
                              className: `h-4 w-4 ${SEVERITY_ICONS[alert.severity]?.color || "text-muted-foreground"}`,
                            })}
                            <span className="capitalize">{alert.severity}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          <span className="font-medium">{alert.title}</span>
                        </TableCell>
                        <TableCell>{alert.service}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[alert.status]?.color || STATUS_BADGES.default.color
                            }`}>
                            {STATUS_BADGES[alert.status]?.label || STATUS_BADGES.default.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDate(alert.timestamp)}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{alert.timestamp.toLocaleString()}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcknowledge(alert.id);
                              }}
                              className="h-8 hover:bg-muted transition-colors"
                              disabled={alert.status !== "active"}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Ack
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-md animate-in fade-in-50 slide-in-from-top-5 duration-300">
          <DialogHeader>
            <DialogTitle>Configure Email Notifications</DialogTitle>
            <DialogDescription>
              Set up SMTP settings to receive email notifications for alerts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.example.com"
                value={smtpConfig.host}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, host: e.target.value })
                }
                className="border-input/60 shadow-sm hover:border-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={smtpConfig.port}
                  onChange={(e) =>
                    setSmtpConfig({
                      ...smtpConfig,
                      port: parseInt(e.target.value) || 587,
                    })
                  }
                  className="border-input/60 shadow-sm hover:border-input"
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2 h-10 w-full">
                  <Switch
                    id="use-tls"
                    checked={smtpConfig.use_tls}
                    onCheckedChange={(checked) =>
                      setSmtpConfig({ ...smtpConfig, use_tls: checked })
                    }
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="use-tls">Use TLS</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-username">Username</Label>
              <Input
                id="smtp-username"
                placeholder="username"
                value={smtpConfig.username}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, username: e.target.value })
                }
                className="border-input/60 shadow-sm hover:border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-password">Password</Label>
              <Input
                id="smtp-password"
                type="password"
                placeholder="••••••••"
                value={smtpConfig.password}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, password: e.target.value })
                }
                className="border-input/60 shadow-sm hover:border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email</Label>
              <Input
                id="from-email"
                placeholder="alerts@example.com"
                value={smtpConfig.from_email}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, from_email: e.target.value })
                }
                className="border-input/60 shadow-sm hover:border-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleSMTPSubmit}
              disabled={isSaving}
              className="hover:shadow-md transition-all duration-200"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-xl animate-in fade-in-50 zoom-in-95 duration-300">
          {selectedAlert && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {React.createElement(SEVERITY_ICONS[selectedAlert.severity]?.icon || AlertCircle, {
                    className: `h-5 w-5 ${SEVERITY_ICONS[selectedAlert.severity]?.color || "text-muted-foreground"}`,
                  })}
                  <DialogTitle className="text-xl">{selectedAlert.title}</DialogTitle>
                </div>
                <DialogDescription className="flex flex-wrap gap-2 mt-2">
                  <Badge className="capitalize">{selectedAlert.severity}</Badge>
                  <Badge variant="outline">{selectedAlert.service}</Badge>
                  <Badge variant="outline">{selectedAlert.environment}</Badge>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[selectedAlert.status]?.color || STATUS_BADGES.default.color
                    }`}>
                    {STATUS_BADGES[selectedAlert.status]?.label || STATUS_BADGES.default.label}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {selectedAlert.description && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Description</h4>
                    <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-md">
                      <ReactMarkdown>{selectedAlert.description}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {selectedAlert.remediation && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Remediation Steps</h4>
                    <div className="text-sm bg-muted/20 p-3 rounded-md">
                      <ReactMarkdown>{selectedAlert.remediation}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <h4 className="font-medium">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <span>Detected</span>
                      </div>
                      <span className="text-muted-foreground">{formatDate(selectedAlert.timestamp)}</span>
                    </div>
                    {selectedAlert.acknowledged && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                          <span>Acknowledged</span>
                        </div>
                        <span className="text-muted-foreground">A few seconds ago</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlert(null)}
                  className="hover:shadow-md transition-all duration-150"
                >
                  Close
                </Button>
                {selectedAlert.status === "active" && (
                  <Button
                    onClick={() => {
                      handleAcknowledge(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    className="hover:shadow-md transition-all duration-150"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Acknowledge
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
