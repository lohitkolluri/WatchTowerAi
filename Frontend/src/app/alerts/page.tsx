"use client";

import React from "react";
import MainLayout from "@/components/layouts/main-layout";
import { Search, Filter, Bell, AlertCircle, Clock, X, CheckCircle, AlertTriangle, Info, ArrowUpDown, RefreshCw, Settings, ChevronLeftIcon, ChevronRightIcon, Slash, Loader2, Eye, EyeOff } from "lucide-react";
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
import { normalizeEnvironment, getEnvironmentLabel, useEnvironments } from "@/lib/environments";
import { Skeleton } from "@/components/ui/skeleton";
import { debounce } from "lodash";

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
  critical: { icon: AlertCircle, color: "text-purple-600" },
  error: { icon: AlertCircle, color: "text-red-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
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
  const [allAlerts, setAllAlerts] = useState<FormattedAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<FormattedAlert[]>([]);
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [showPassword, setShowPassword] = useState(false);

  const formatAlerts = useCallback((alertsData: Alert[]): FormattedAlert[] => {
    return alertsData.map((alert): FormattedAlert => ({
      id: alert._id,
      title: alert.message,
      service: alert.service_name,
      environment: normalizeEnvironment(alert.environment),
      severity: alert.level,
      status: alert.status || (alert.acknowledged ? 'acknowledged' : 'active'),
      timestamp: new Date(alert.timestamp),
      acknowledged: alert.acknowledged,
      description: alert.description,
      remediation: alert.remediation,
    }));
  }, []);

  const applyFilters = useCallback((alerts: FormattedAlert[], currentFilters: AlertFilters) => {
    return alerts.filter(alert => {
      if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        const titleMatch = (alert.title || '').toLowerCase().includes(searchLower);
        const serviceMatch = (alert.service || '').toLowerCase().includes(searchLower);
        const environmentMatch = (alert.environment || '').toLowerCase().includes(searchLower);
        const severityMatch = (alert.severity || '').toLowerCase().includes(searchLower);
        const descriptionMatch = (alert.description || '').toLowerCase().includes(searchLower);
        const remediationMatch = (alert.remediation || '').toLowerCase().includes(searchLower);

        if (!titleMatch && !serviceMatch && !environmentMatch &&
          !severityMatch && !descriptionMatch && !remediationMatch) {
          return false;
        }
      }

      if (currentFilters.service !== 'all' && (!alert.service || alert.service !== currentFilters.service)) {
        return false;
      }

      if (currentFilters.environment !== 'all' && (!alert.environment || alert.environment !== currentFilters.environment)) {
        return false;
      }

      if (currentFilters.severity !== 'all' && (!alert.severity || alert.severity !== currentFilters.severity)) {
        return false;
      }

      if (currentFilters.status !== 'all' && (!alert.status || alert.status !== currentFilters.status)) {
        return false;
      }

      return true;
    });
  }, []);

  useEffect(() => {
    const filtered = applyFilters(allAlerts, filters);

    // Sort alerts purely by timestamp (newest first)
    const sortedAlerts = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredAlerts(sortedAlerts);

    setPagination(prev => ({
      ...prev,
      total: sortedAlerts.length,
      totalPages: Math.ceil(sortedAlerts.length / prev.limit),
      page: 1
    }));
  }, [filters, allAlerts, applyFilters]);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const alertsData = await api.alerts.getAll();

      if (!alertsData || !Array.isArray(alertsData.data)) {
        throw new Error('Invalid response format');
      }

      const formattedAlerts = formatAlerts(alertsData.data);

      // Sort alerts purely by timestamp (newest first)
      const sortedAlerts = formattedAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setAllAlerts(sortedAlerts);

      const uniqueServices = Array.from(new Set(formattedAlerts.map(alert => alert.service))).filter(Boolean);
      const uniqueEnvironments = Array.from(new Set(formattedAlerts.map(alert => alert.environment))).filter(Boolean);

      setServices(uniqueServices.sort());
      setEnvironments(uniqueEnvironments.sort());

    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch alerts');
      toast.error('Failed to fetch alerts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formatAlerts]);

  const handleRefreshClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void fetchAlerts();
  }, [fetchAlerts]);

  const handleFilterChange = (key: keyof AlertFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterClear = useCallback((e: React.MouseEvent<HTMLButtonElement>, key: keyof AlertFilters) => {
    e.preventDefault();
    handleFilterChange(key, 'all');
  }, []);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    debouncedSearch(searchTerm);
  };

  const clearSearch = () => {
    const searchInput = document.querySelector('input[placeholder="Search alerts..."]') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    setFilters(prev => ({ ...prev, search: '' }));
  };

  const handlePreviousPage = useCallback(() => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  }, [pagination.page]);

  const handleNextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination.page, pagination.totalPages]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAutoRefresh) {
      intervalId = setInterval(() => {
        void fetchAlerts();
      }, 30000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoRefresh, fetchAlerts]);

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

  const getSeverityIcon = (severity: string) => {
    if (!severity) return null;
    const config = SEVERITY_ICONS[severity.toLowerCase() as keyof typeof SEVERITY_ICONS];
    if (!config) return null;

    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const startItem = filteredAlerts.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, filteredAlerts.length);

  const getPaginatedAlerts = useCallback(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filteredAlerts.slice(start, end);
  }, [filteredAlerts, pagination.page, pagination.limit]);

  const displayedAlerts = getPaginatedAlerts();

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.alerts.acknowledge(alertId);

      // Update both allAlerts and filteredAlerts states
      setAllAlerts(prevAlerts => prevAlerts.map(alert => {
        if (alert.id === alertId) {
          return {
            ...alert,
            acknowledged: true,
            status: 'acknowledged'  // Use the status from the backend
          };
        }
        return alert;
      }));

      // Update the selected alert if it's the one being acknowledged
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(prev => prev ? {
          ...prev,
          acknowledged: true,
          status: 'acknowledged'  // Use the status from the backend
        } : null);
      }

      toast.success("Alert acknowledged successfully");
      setSelectedAlert(null);
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      toast.error("Failed to acknowledge alert");
    }
  };

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

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-border/60 animate-in fade-in-50">
          <CardHeader className="bg-muted/30 rounded-t-lg pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="h-5 w-5 text-primary" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="Search alerts..."
                    onChange={handleSearchChange}
                    className="pl-9 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                    defaultValue={filters.search}
                  />
                  {filters.search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1.5 h-7 w-7 opacity-70 hover:opacity-100 transition-opacity"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select
                  value={filters.service}
                  onValueChange={(value) => handleFilterChange('service', value)}
                >
                  <SelectTrigger className="w-[180px]">
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
                <Select
                  value={filters.environment}
                  onValueChange={(value) => handleFilterChange('environment', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select environment" />
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
                <Select
                  value={filters.severity}
                  onValueChange={(value) => handleFilterChange('severity', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-purple-600" />
                        Critical
                      </div>
                    </SelectItem>
                    <SelectItem value="error">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                        Error
                      </div>
                    </SelectItem>
                    <SelectItem value="warning">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                        Warning
                      </div>
                    </SelectItem>
                    <SelectItem value="info">
                      <div className="flex items-center">
                        <Info className="h-4 w-4 mr-2 text-blue-500" />
                        Info
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Active filters display */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (value && value !== 'all') {
                    return (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="px-2 py-1 hover:bg-secondary/80"
                      >
                        {key}: {value}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange(key as keyof AlertFilters, 'all');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  }
                  return null;
                })}
                {Object.values(filters).some(value => value && value !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setFilters({
                        search: "",
                        service: "all",
                        environment: "all",
                        severity: "all",
                        status: "all",
                      });
                      const searchInput = document.querySelector('input[placeholder="Search alerts..."]') as HTMLInputElement;
                      if (searchInput) searchInput.value = '';
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-border/60 animate-in fade-in-50">
          <CardHeader className="bg-muted/30 rounded-t-lg pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="h-5 w-5 text-primary" />
              Active Alerts
            </CardTitle>
            <CardDescription>View and manage system alerts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="rounded-full bg-muted/20 p-4 mb-4">
                  <Slash className="h-8 w-8 text-muted-foreground/70" />
                </div>
                <h3 className="text-lg font-medium">No alerts found</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Try changing your filters or refreshing the page
                </p>
                <Button variant="outline" onClick={fetchAlerts}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="relative overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[120px] py-3">Severity</TableHead>
                      <TableHead className="w-[280px] py-3">Message</TableHead>
                      <TableHead className="w-[160px] py-3">Service</TableHead>
                      <TableHead className="w-[120px] py-3">Status</TableHead>
                      <TableHead className="w-[160px] py-3">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedAlerts.map((alert: FormattedAlert, index: number) => (
                      <TableRow
                        key={alert.id}
                        className={`group hover:bg-muted/50 transition-colors cursor-pointer animate-in fade-in-50 slide-in-from-left-3 hover:shadow-sm`}
                        onClick={() => setSelectedAlert(alert)}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell className="font-medium py-3">
                          <div className="flex items-center gap-2">
                            {React.createElement(SEVERITY_ICONS[alert.severity]?.icon || AlertCircle, {
                              className: `h-4 w-4 ${SEVERITY_ICONS[alert.severity]?.color || "text-muted-foreground"}`,
                            })}
                            <span className="capitalize">{alert.severity}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-medium line-clamp-1 group-hover:text-primary transition-colors">{alert.title}</span>
                        </TableCell>
                        <TableCell className="py-3">{alert.service}</TableCell>
                        <TableCell className="py-3">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[alert.status]?.color || STATUS_BADGES.default.color
                            }`}>
                            {STATUS_BADGES[alert.status]?.label || STATUS_BADGES.default.label}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 font-mono text-xs">
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{filteredAlerts.length === 0 ? 0 : startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{pagination.total}</span> alerts
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1 || isLoading}
                      onClick={handlePreviousPage}
                      className="hover:shadow-md transition-all duration-200"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages || isLoading}
                      onClick={handleNextPage}
                      className="hover:shadow-md transition-all duration-200"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent
          className="sm:max-w-md animate-in fade-in-50 slide-in-from-top-5 duration-300 shadow-xl border"
          aria-describedby="smtp-config-description"
        >
          <div id="smtp-config-description" className="sr-only">
            Configure SMTP settings for email notifications
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl">Configure Email Notifications</DialogTitle>
            <DialogDescription>
              Set up SMTP settings to receive email notifications for alerts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground pb-1 border-b">SMTP Settings</h3>

              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) =>
                    setSmtpConfig({ ...smtpConfig, host: e.target.value })
                  }
                  className="border-input/60 shadow-sm hover:border-input focus:ring-2 focus:ring-primary/30 transition-all"
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
                    className="border-input/60 shadow-sm hover:border-input focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <Label htmlFor="use-tls" className="mb-2">Use TLS</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="use-tls"
                      checked={smtpConfig.use_tls}
                      onCheckedChange={(checked) =>
                        setSmtpConfig({ ...smtpConfig, use_tls: checked })
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="text-sm">{smtpConfig.use_tls ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground pb-1 border-b">Authentication</h3>

              <div className="space-y-2">
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  placeholder="your-email@gmail.com"
                  value={smtpConfig.username}
                  onChange={(e) =>
                    setSmtpConfig({ ...smtpConfig, username: e.target.value })
                  }
                  className="border-input/60 shadow-sm hover:border-input focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">Password</Label>
                <div className="relative">
                  <Input
                    id="smtp-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={smtpConfig.password}
                    onChange={(e) =>
                      setSmtpConfig({ ...smtpConfig, password: e.target.value })
                    }
                    className="border-input/60 shadow-sm hover:border-input focus:ring-2 focus:ring-primary/30 transition-all pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground pb-1 border-b">Sender</h3>

              <div className="space-y-2">
                <Label htmlFor="from-email">From Email</Label>
                <Input
                  id="from-email"
                  placeholder="alerts@yourdomain.com"
                  value={smtpConfig.from_email}
                  onChange={(e) =>
                    setSmtpConfig({ ...smtpConfig, from_email: e.target.value })
                  }
                  className="border-input/60 shadow-sm hover:border-input focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <p className="text-xs text-muted-foreground">This email address will appear as the sender for all alert notifications.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              onClick={handleSMTPSubmit}
              disabled={isSaving}
              className="hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-primary/30"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] animate-in fade-in-50 zoom-in-95 duration-300 shadow-xl"
          aria-describedby="alert-dialog-description"
        >
          <div id="alert-dialog-description" className="sr-only">
            Alert details and actions for {selectedAlert?.title}
          </div>
          {selectedAlert && (
            <>
              <div className="flex flex-col space-y-1 mb-4">
                <div className="flex items-center">
                  {React.createElement(SEVERITY_ICONS[selectedAlert.severity]?.icon || AlertCircle, {
                    className: `h-5 w-5 mr-2 ${SEVERITY_ICONS[selectedAlert.severity]?.color || "text-muted-foreground"}`,
                  })}
                  <span className="text-xl font-semibold">{selectedAlert.title}</span>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {formatDate(selectedAlert.timestamp)}
                </div>
              </div>

              <div className="space-y-6 overflow-y-auto pr-1 max-h-[60vh] custom-scrollbar">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize font-medium">
                    {selectedAlert.severity}
                  </Badge>
                  <Badge variant="outline" className="font-medium">
                    {selectedAlert.service}
                  </Badge>
                  <Badge variant="outline" className="font-medium">
                    {selectedAlert.environment}
                  </Badge>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[selectedAlert.status]?.color || STATUS_BADGES.default.color}`}>
                    {STATUS_BADGES[selectedAlert.status]?.label || STATUS_BADGES.default.label}
                  </div>
                </div>

                {selectedAlert.description && (
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-primary">Description</h4>
                    <div className="bg-muted/50 p-4 rounded-md border shadow-sm hover:shadow-md transition-all">
                      <div className="text-sm">
                        <ReactMarkdown>{selectedAlert.description}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAlert.remediation && (
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-primary">Remediation Steps</h4>
                    <div className="bg-muted/50 p-4 rounded-md border shadow-sm hover:shadow-md transition-all">
                      <div className="text-sm font-mono">
                        <ReactMarkdown>{selectedAlert.remediation}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-base font-semibold text-primary">Timeline</h4>
                  <div className="bg-muted/50 p-4 rounded-md border shadow-sm hover:shadow-md transition-all space-y-3">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <span>Detected</span>
                      </div>
                      <span className="text-muted-foreground font-mono">{formatDate(selectedAlert.timestamp)}</span>
                    </div>
                    {selectedAlert.acknowledged && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                          <span>Acknowledged</span>
                        </div>
                        <span className="text-muted-foreground font-mono">A few seconds ago</span>
                      </div>
                    )}
                    {selectedAlert.status === "resolved" && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>Resolved</span>
                        </div>
                        <span className="text-muted-foreground font-mono">N/A</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h3 className="text-xs font-medium mb-1 text-muted-foreground">Service</h3>
                    <p className="text-sm">{selectedAlert.service}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium mb-1 text-muted-foreground">Environment</h3>
                    <p className="text-sm">{selectedAlert.environment}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-between items-center gap-2 pt-6">
                <div className="flex items-center gap-2">
                  {!selectedAlert.acknowledged && selectedAlert.status !== "resolved" && (
                    <Button
                      variant="outline"
                      onClick={() => handleAcknowledge(selectedAlert.id)}
                      className="hover:shadow-md transition-all duration-200"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Acknowledge
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlert(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
