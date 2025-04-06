"use client";

import { ReactNode } from "react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { AlertCircle, ChevronRight, Activity, Bell, Terminal, Settings, ExternalLink, BarChart2, ArrowUpRight, Loader2, ArrowRight, RefreshCw, CheckCircle, AlertTriangle, Info, FileText, LineChart, ArrowDownRight, PieChart } from "lucide-react";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Service, Alert, ServiceHealth, ServiceMetrics, PaginatedResponse, Log } from '@/types/common';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatabaseIcon } from "lucide-react";
import { normalizeEnvironment, getEnvironmentLabel } from "@/lib/environments";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import authService from '@/services/authService';

const MainLayout = dynamic(() => import('@/components/layouts/main-layout'), { ssr: false });

// Add interfaces at the top of the file
interface FormattedAlert {
  id: string;
  title: string;
  service: string;
  environment: string;
  severity: string;
  status: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface ErrorRateDataPoint {
  time: string; // For display
  errorRate: number;
  timestamp: string; // ISO string
}

interface DashboardServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "critical";
  lastCheck: string;
  metrics: ServiceMetrics | null;
}

interface Metric {
  service_name: string;
  environment: string;
  total_requests?: number;
  errors?: number;
  total?: number;
  log_types?: Record<string, number>;
  log_subtypes?: Record<string, Record<string, number>>;
  updated_at?: string;
  last_updated?: string;
  response_time?: number;
  avg_response_time?: number;
}

interface QuickAction {
  icon: any;
  label: string;
  href: string;
}

interface EnvironmentErrorRate {
  name: string;
  value: number;
  color: string;
}

const ErrorRateCard = ({ data, isLoading }: { data: ErrorRateDataPoint[], isLoading: boolean }) => {
  const handleChartClick = (point: ErrorRateDataPoint | undefined) => {
    if (!point) return;

    const clickedDate = new Date(point.timestamp);
    const startTime = new Date(clickedDate.getTime() - 15 * 60 * 1000);
    const endTime = new Date(clickedDate.getTime() + 15 * 60 * 1000);

    const startParam = startTime.toISOString();
    const endParam = endTime.toISOString();

    window.location.href = `/logs?level=error&startDate=${startParam}&endDate=${endParam}`;
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onClick={(point) => handleChartClick(point?.activePayload?.[0]?.payload)}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis
              dataKey="time"
              stroke="rgb(156, 163, 175)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgb(156, 163, 175)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px'
              }}
              labelStyle={{
                color: 'rgb(255, 255, 255)',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: 'bold',
                marginBottom: '4px'
              }}
              itemStyle={{
                color: 'rgb(255, 255, 255)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(2)}%`,
                name === 'errorRate' ? 'Error Rate' : name
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="errorRate"
              stroke="rgb(234, 179, 8)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'rgb(234, 179, 8)', stroke: 'rgb(255, 255, 255)' }}
              activeDot={{ r: 5, fill: 'rgb(234, 179, 8)', stroke: 'rgb(255, 255, 255)' }}
              fill="rgba(234, 179, 8, 0.1)"
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const ErrorRatePieChart = ({ data, isLoading }: { data: EnvironmentErrorRate[], isLoading: boolean }) => {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      {isLoading ? (
        <div className="flex flex-col space-y-4 w-full h-full">
          <div className="flex items-center justify-center flex-1">
            <div className="relative w-[160px] h-[160px]">
              <Skeleton className="absolute inset-0 rounded-full" />
              <Skeleton className="absolute inset-[30px] rounded-full bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
                            <span className="font-medium">{data.name}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Error Rate</span>
                              <span className="font-mono font-medium" style={{ color: data.color }}>
                                {data.value.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Errors</span>
                              <span className="font-mono text-muted-foreground">{data.errors.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Total Requests</span>
                              <span className="font-mono text-muted-foreground">{data.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            {data.slice(0, 4).map((env) => (
              <div key={env.name} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: env.color }} />
                <span className="text-xs font-medium text-muted-foreground">{env.name}</span>
              </div>
            ))}
            {data.length > 4 && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                    <span className="text-xs font-medium text-muted-foreground">+{data.length - 4} more</span>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-auto">
                  <div className="space-y-2">
                    {data.slice(4, 9).map((env) => (
                      <div key={env.name} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: env.color }} />
                        <span className="text-sm font-medium">{env.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({env.value.toFixed(2)}%)</span>
                      </div>
                    ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function Dashboard() {
  const [logVolume, setLogVolume] = useState<number>(0);
  const [activeAlerts, setActiveAlerts] = useState<FormattedAlert[]>([]);
  const [serviceHealth, setServiceHealth] = useState<DashboardServiceHealth[]>([]);
  const [errorRateData, setErrorRateData] = useState<ErrorRateDataPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [environmentErrorRates, setEnvironmentErrorRates] = useState<EnvironmentErrorRate[]>([]);
  const router = useRouter();

  // Add quick actions
  const quickActions: QuickAction[] = [
    { icon: Activity, label: "View Metrics", href: "/analytics" },
    { icon: Bell, label: "Manage Alerts", href: "/alerts" },
    { icon: Terminal, label: "View Logs", href: "/logs" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  // Helper function to calculate average uptime from services
  const calculateAverageUptime = (services: DashboardServiceHealth[]): number => {
    if (services.length === 0) return 0;

    const servicesWithUptime = services.filter(service => service.metrics?.uptime !== undefined);
    if (servicesWithUptime.length === 0) return 0;

    const totalUptime = servicesWithUptime.reduce((sum, service) =>
      sum + (service.metrics?.uptime || 0), 0);

    return totalUptime / servicesWithUptime.length;
  };

  const handleAcknowledge = async (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation(); // Prevent triggering the parent click event
    try {
      await api.alerts.acknowledge(alertId);
      // Update the local state
      setActiveAlerts(prev => prev.map(alert => {
        if (alert.id === alertId) {
          return {
            ...alert,
            acknowledged: true,
            status: 'acknowledged'
          };
        }
        return alert;
      }));
      toast.success("Alert acknowledged successfully");
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      toast.error("Failed to acknowledge alert");
    }
  };

  useEffect(() => {
    // Check authentication and redirect if not authenticated
    const checkAuth = async () => {
      if (!authService.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        router.push('/auth/login');
        return;
      }

      // Verify token validity
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          console.log('Invalid token in home page, logging out');
          authService.logout();
        }
      } catch (error) {
        console.error('Error verifying token in home page:', error);
        authService.logout();
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch services with their metrics
        const services = await api.services.getAll();
        console.log('Services with metrics:', services);

        if (!services || services.length === 0) {
          console.warn('No services found');
          setServiceHealth([]);
        } else {
          // Format service health data
          const healthData: DashboardServiceHealth[] = services.map((service: Service) => ({
            name: service.name,
            status: (service.status === "Active" ? "healthy" :
              service.status === "Pending" ? "degraded" : "critical") as "healthy" | "degraded" | "critical",
            lastCheck: new Date().toISOString(), // Use current time as fallback
            metrics: service.metrics || null
          }));

          setServiceHealth(healthData);
        }

        // Fetch and format alerts with normalized environments
        const alertsResponse = await api.alerts.getAll();
        const formattedAlerts = Array.isArray(alertsResponse)
          ? alertsResponse
          : alertsResponse?.data || [];

        if (!formattedAlerts || formattedAlerts.length === 0) {
          console.warn('No alerts found');
          setActiveAlerts([]);
        } else {
          setActiveAlerts(formattedAlerts.map((alert: Alert): FormattedAlert => ({
            id: alert._id,
            title: alert.message,
            service: alert.service_name,
            environment: normalizeEnvironment(alert.environment),
            severity: alert.severity,
            status: alert.status,
            timestamp: new Date(alert.timestamp),
            acknowledged: alert.acknowledged
          })));
        }

        // Fetch log volume
        const logsData = await api.logs.getAll();

        // Safely handle different possible response formats
        let logCount = 0;
        if (logsData && typeof logsData === 'object') {
          if (Array.isArray(logsData)) {
            logCount = logsData.length;
          } else if (Array.isArray(logsData.data)) {
            logCount = logsData.data.length;
          }
        }

        setLogVolume(logCount);

        // Fetch metrics for service health and error rate
        const metricsResponse = await api.metrics.getAll();
        console.log('Metrics response:', metricsResponse);

        // Safely extract metrics data with proper type handling
        let metricsData: any[] = []; // Use any[] to accommodate different metric formats

        if (Array.isArray(metricsResponse)) {
          metricsData = metricsResponse;
        } else if (metricsResponse && typeof metricsResponse === 'object') {
          // Try to access properties with type safety
          const typedResponse = metricsResponse as {
            metrics?: any[];
            data?: any[];
          };

          if (Array.isArray(typedResponse.metrics)) {
            metricsData = typedResponse.metrics;
          } else if (Array.isArray(typedResponse.data)) {
            metricsData = typedResponse.data;
          }
        }

        if (metricsData.length === 0) {
          console.warn("No metrics data found");
          setErrorRateData([]);
          setLogVolume(0);
          return;
        }

        // Format error rate data - sort by timestamp and calculate error rate
        const sortedMetrics = [...metricsData].sort((a, b) => {
          const aTime = a.last_updated || a.updated_at || new Date().toISOString();
          const bTime = b.last_updated || b.updated_at || new Date().toISOString();
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        });

        const errorRatePoints = sortedMetrics.map((metric: Metric) => {
          const timestamp = metric.last_updated || metric.updated_at || new Date().toISOString();
          const total = metric.total_requests || metric.total || 0;
          const errors = metric.errors || 0;
          return {
            time: new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            errorRate: total > 0 ? (errors / total * 100) : 0,
            timestamp: timestamp
          };
        });

        setErrorRateData(errorRatePoints);

        // Calculate total events for log volume
        const totalEvents = metricsData.reduce((sum: number, metric: Metric) => {
          const total = metric.total_requests || metric.total || 0;
          return sum + total;
        }, 0);
        setLogVolume(totalEvents);

        // Calculate error rates by environment
        const environmentData: Record<string, { errors: number; total: number }> = {};

        metricsData.forEach((metric: Metric) => {
          const env = normalizeEnvironment(metric.environment);
          if (!environmentData[env]) {
            environmentData[env] = { errors: 0, total: 0 };
          }
          environmentData[env].errors += metric.errors || 0;
          environmentData[env].total += metric.total_requests || metric.total || 0;
        });

        const environmentColors: Record<string, string> = {
          production: '#22c55e',    // Richer green
          staging: '#eab308',       // Richer yellow
          development: '#3b82f6',   // Richer blue
          test: '#a855f7',         // Richer purple
          dev: '#ec4899',          // Pink
          qa: '#14b8a6',           // Teal
          sandbox: '#f97316',      // Orange
          demo: '#6366f1'          // Indigo
        };

        const errorRatesByEnvironment: EnvironmentErrorRate[] = Object.entries(environmentData)
          .map(([env, data]) => ({
            name: getEnvironmentLabel(env),
            value: data.total > 0 ? (data.errors / data.total * 100) : 0,
            color: environmentColors[env] || '#94a3b8', // Slate as fallback
            total: data.total,
            errors: data.errors
          }))
          .sort((a, b) => b.value - a.value);

        setEnvironmentErrorRates(errorRatesByEnvironment);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data. Please try again later.');
        // Set empty states for all data
        setServiceHealth([]);
        setActiveAlerts([]);
        setErrorRateData([]);
        setLogVolume(0);
        setEnvironmentErrorRates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const refreshDashboard = () => {
    window.location.reload();
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-6 animate-in slide-in-from-top duration-500">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              System overview and real-time metrics
            </p>
          </div>
          <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
            <Button
              variant="outline"
              onClick={refreshDashboard}
              disabled={isLoading}
              className="bg-background hover:bg-muted/80 shadow-sm hover:shadow-md transition-all duration-200 border-border/60"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
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

        {/* Error Rate Widget - Full Width */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50 slide-in-from-left-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Error Rate
              </CardTitle>
              <Button variant="ghost" size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary shadow-sm hover:shadow-md transition-all duration-200" asChild>
                <Link href="/logs">View Logs</Link>
              </Button>
            </div>
            <CardDescription className="flex items-center gap-2">
              Error rate over the last 24 hours
              {errorRateData.length > 0 && (
                <span className="text-sm font-medium">
                  Current: {errorRateData[errorRateData.length - 1].errorRate.toFixed(2)}%
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex flex-col gap-4 h-[300px] bg-muted/20 rounded-md p-4">
                <div className="flex items-center justify-center">
                  <Skeleton className="h-12 w-32" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ) : errorRateData.length > 0 ? (
              <div className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={errorRateData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="time"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0]?.value;
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Time
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {label}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Error Rate
                                  </span>
                                  <span className="font-bold text-primary">
                                    {typeof value === 'number' ? value.toFixed(2) : '0.00'}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="errorRate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        style: { fill: 'hsl(var(--primary))', opacity: 0.8 }
                      }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] bg-muted/10 rounded-md">
                <div className="rounded-full bg-muted/20 p-4 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xl font-medium mb-2">No errors detected</p>
                <p className="text-muted-foreground text-center max-w-xs">
                  All systems are functioning normally without any detected errors in the past 24 hours.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Three Column Layout for Remaining Widgets */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in-50 duration-700">
          {/* Log Volume Widget */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Log Volume
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <p className="text-sm">Log volume shows the distribution of log entries across different severity levels in the last 24 hours.</p>
                        <div className="text-xs text-muted-foreground">
                          Click "View Logs" for detailed analysis.
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </CardTitle>
                <Button variant="ghost" size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary shadow-sm hover:shadow-md transition-all duration-200" asChild>
                  <Link href="/logs">View Logs</Link>
                </Button>
              </div>
              <CardDescription>Log entries in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex flex-col gap-4 h-[300px] bg-muted/20 rounded-md p-4">
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-12 w-32" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2">
                      <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {logVolume.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="relative group">
                      <div className="space-y-1 text-center p-3 rounded-lg bg-green-500/5 hover:bg-green-500/10 transition-colors">
                        <div className="absolute inset-0 rounded-lg border-2 border-green-500/20 group-hover:border-green-500/30 transition-colors"></div>
                        <div className="relative">
                          <span className="text-xl font-semibold text-green-500">
                            {Math.floor(logVolume * 0.7).toLocaleString()}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">Info</p>
                          <div className="mt-2 h-1 bg-green-500/20 rounded-full">
                            <div className="h-1 bg-green-500 rounded-full" style={{ width: '70%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative group">
                      <div className="space-y-1 text-center p-3 rounded-lg bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors">
                        <div className="absolute inset-0 rounded-lg border-2 border-yellow-500/20 group-hover:border-yellow-500/30 transition-colors"></div>
                        <div className="relative">
                          <span className="text-xl font-semibold text-yellow-500">
                            {Math.floor(logVolume * 0.2).toLocaleString()}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">Warning</p>
                          <div className="mt-2 h-1 bg-yellow-500/20 rounded-full">
                            <div className="h-1 bg-yellow-500 rounded-full" style={{ width: '20%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative group">
                      <div className="space-y-1 text-center p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors">
                        <div className="absolute inset-0 rounded-lg border-2 border-red-500/20 group-hover:border-red-500/30 transition-colors"></div>
                        <div className="relative">
                          <span className="text-xl font-semibold text-red-500">
                            {Math.floor(logVolume * 0.1).toLocaleString()}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">Error</p>
                          <div className="mt-2 h-1 bg-red-500/20 rounded-full">
                            <div className="h-1 bg-red-500 rounded-full" style={{ width: '10%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Top Sources</span>
                      <span className="text-muted-foreground">Logs</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span className="text-sm group-hover:text-primary transition-colors">API Gateway</span>
                        </div>
                        <span className="font-mono text-sm text-muted-foreground">{Math.floor(logVolume * 0.35).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span className="text-sm group-hover:text-primary transition-colors">Auth Service</span>
                        </div>
                        <span className="font-mono text-sm text-muted-foreground">{Math.floor(logVolume * 0.25).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span className="text-sm group-hover:text-primary transition-colors">Database</span>
                        </div>
                        <span className="font-mono text-sm text-muted-foreground">{Math.floor(logVolume * 0.20).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environment Error Rate Widget */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Environment Error Rates
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <p className="text-sm">Distribution of error rates across different environments in the last 24 hours.</p>
                        <div className="text-xs text-muted-foreground">
                          Hover over chart segments for detailed metrics.
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </CardTitle>
              </div>
              <CardDescription>Error distribution by environment</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ErrorRatePieChart data={environmentErrorRates} isLoading={isLoading} />
            </CardContent>
          </Card>

          {/* Recent Alerts Widget */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50 slide-in-from-right-5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Recent Alerts
                </CardTitle>
                <Button variant="ghost" size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary shadow-sm hover:shadow-md transition-all duration-200" asChild>
                  <Link href="/alerts">View All</Link>
                </Button>
              </div>
              <CardDescription>Most recent system alerts</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4 animate-pulse">
                      <div className="w-6 h-6 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="flex gap-2">
                          <div className="h-3 bg-muted rounded w-16"></div>
                          <div className="h-3 bg-muted rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-md">
                  <div className="rounded-full bg-muted/20 p-4 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-xl font-medium mb-2">No active alerts</p>
                  <p className="text-muted-foreground text-center max-w-xs">
                    All systems are operating normally without any active alerts.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {activeAlerts.slice(0, 5).map((alert, index) => (
                    <div
                      key={alert.id}
                      className="py-4 first:pt-2 hover:bg-muted/20 rounded-md px-2 -mx-2 transition-colors cursor-pointer animate-in fade-in-50 group"
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => {
                        const queryParams = new URLSearchParams({
                          severity: alert.severity,
                          service: alert.service,
                        });
                        window.location.href = `/alerts?${queryParams.toString()}`;
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-1 ${alert.severity === 'critical'
                          ? 'bg-red-100 text-red-600'
                          : alert.severity === 'warning'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-blue-100 text-blue-600'
                          }`}>
                          {alert.severity === 'critical' ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : alert.severity === 'warning' ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Info className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{alert.title}</p>
                          <div className="flex items-center text-xs gap-2 mt-1.5 flex-wrap">
                            <Badge variant="secondary" className="bg-muted/50 hover:bg-muted text-muted-foreground">
                              {alert.service}
                            </Badge>
                            <Badge variant="secondary" className="bg-muted/50 hover:bg-muted text-muted-foreground">
                              {getEnvironmentLabel(alert.environment)}
                            </Badge>
                            <Badge variant="secondary" className="bg-muted/50 hover:bg-muted font-mono text-muted-foreground">
                              {format(alert.timestamp, 'HH:mm')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 ${alert.acknowledged
                              ? 'text-muted-foreground hover:bg-muted/10 cursor-not-allowed opacity-50'
                              : 'text-green-500 hover:bg-green-500/10 hover:text-green-600'
                              }`}
                            onClick={(e) => !alert.acknowledged && handleAcknowledge(e, alert.id)}
                            disabled={alert.acknowledged}
                            title={alert.acknowledged ? 'Alert acknowledged' : 'Acknowledge alert'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
