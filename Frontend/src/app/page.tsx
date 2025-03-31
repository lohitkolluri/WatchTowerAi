"use client";

import { ReactNode } from "react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { AlertCircle, ChevronRight, Activity, Bell, Terminal, Settings, ExternalLink, BarChart2, ArrowUpRight, Loader2, ArrowRight, RefreshCw, CheckCircle, AlertTriangle, Info, FileText, LineChart } from "lucide-react";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Line as LineChartJS } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Service, Alert, ServiceHealth, ServiceMetrics, PaginatedResponse, Log } from '@/types/common';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatabaseIcon } from "lucide-react";
import { normalizeEnvironment, getEnvironmentLabel } from "@/lib/environments";

const MainLayout = dynamic(() => import('@/components/layouts/main-layout'), { ssr: false });

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

const ErrorRateCard = ({ data, isLoading }: { data: ErrorRateDataPoint[], isLoading: boolean }) => {
  const chartData = {
    labels: data.map(point => point.time),
    datasets: [
      {
        label: 'Error Rate',
        data: data.map(point => point.errorRate),
        fill: true,
        tension: 0.4,
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        pointRadius: 3,
        pointBackgroundColor: 'rgb(234, 179, 8)',
        pointBorderColor: 'rgb(255, 255, 255)',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgb(234, 179, 8)',
        pointHoverBorderColor: 'rgb(255, 255, 255)',
        borderWidth: 2,
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(255, 255, 255)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function (context: any) {
            return `Error Rate: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          maxRotation: 0
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: function (value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  return <LineChartJS data={chartData} options={options} />;
};

export default function Dashboard() {
  const [logVolume, setLogVolume] = useState<number>(0);
  const [activeAlerts, setActiveAlerts] = useState<FormattedAlert[]>([]);
  const [serviceHealth, setServiceHealth] = useState<DashboardServiceHealth[]>([]);
  const [errorRateData, setErrorRateData] = useState<ErrorRateDataPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data. Please try again later.');
        // Set empty states for all data
        setServiceHealth([]);
        setActiveAlerts([]);
        setErrorRateData([]);
        setLogVolume(0);
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
              className="hover:shadow-md transition-all duration-200"
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {/* Error Rate Widget */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50 slide-in-from-left-5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Error Rate
                </CardTitle>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50" asChild>
                  <Link href="/logs">View Logs</Link>
                </Button>
              </div>
              <CardDescription>Error rate over the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px] bg-muted/20 rounded-md animate-pulse">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin opacity-70" />
                </div>
              ) : errorRateData.length > 0 ? (
                <div className="h-[300px] mt-4">
                  <ErrorRateCard data={errorRateData} isLoading={isLoading} />
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

          {/* Active Alerts Widget */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50 slide-in-from-right-5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Recent Alerts
                </CardTitle>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50" asChild>
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
                  {activeAlerts.slice(0, 3).map((alert, index) => (
                    <div
                      key={alert.id}
                      className="py-4 first:pt-2 hover:bg-muted/20 rounded-md px-2 -mx-2 transition-colors cursor-pointer animate-in fade-in-50"
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => window.location.href = `/alerts?alert=${alert.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-1 ${alert.severity === 'critical'
                          ? 'bg-red-100 text-red-600'
                          : alert.severity === 'warning'
                            ? 'bg-yellow-100 text-yellow-600'
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
                          <p className="text-sm font-medium truncate">{alert.title}</p>
                          <div className="flex items-center text-xs text-muted-foreground gap-2 mt-1">
                            <span>{alert.service}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
                            <span>{getEnvironmentLabel(alert.environment)}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
                            <span>{format(alert.timestamp, 'HH:mm')}</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`capitalize ${alert.severity === 'critical'
                            ? 'border-red-200 text-red-600'
                            : alert.severity === 'warning'
                              ? 'border-yellow-200 text-yellow-600'
                              : 'border-blue-200 text-blue-600'
                            }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {activeAlerts.length > 3 && (
              <CardFooter className="pt-0 pb-4">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/alerts">View All Alerts</Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in-50 duration-700">
          {/* Service Health Widget */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Service Health
                </CardTitle>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50" asChild>
                  <Link href="/services">Manage</Link>
                </Button>
              </div>
              <CardDescription>Overall service health status</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-2 bg-muted/50 rounded-full">
                        <div className="h-2 bg-muted rounded-full w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <span className="text-3xl font-bold text-green-500">{serviceHealth.filter(s => s.status === "healthy").length}</span>
                      <p className="text-xs text-muted-foreground">Healthy</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-3xl font-bold text-yellow-500">{serviceHealth.filter(s => s.status === "degraded").length}</span>
                      <p className="text-xs text-muted-foreground">Degraded</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-3xl font-bold text-red-500">{serviceHealth.filter(s => s.status === "critical").length}</span>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Healthy</span>
                        <span className="text-muted-foreground">
                          {calculateAverageUptime(serviceHealth).toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full">
                        <div
                          className="h-2 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                          style={{ width: `${calculateAverageUptime(serviceHealth)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Degraded</span>
                        <span className="text-muted-foreground">
                          {serviceHealth.filter(s => s.status === "degraded").length > 0 ? (
                            (serviceHealth.filter(s => s.status === "degraded").length / serviceHealth.length * 100).toFixed(2) + '%'
                          ) : '0%'}
                        </span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full">
                        <div
                          className="h-2 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${serviceHealth.filter(s => s.status === "degraded").length > 0 ? (serviceHealth.filter(s => s.status === "degraded").length / serviceHealth.length * 100).toFixed(2) : '0'}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Critical</span>
                        <span className="text-muted-foreground">
                          {serviceHealth.filter(s => s.status === "critical").length > 0 ? (
                            (serviceHealth.filter(s => s.status === "critical").length / serviceHealth.length * 100).toFixed(2) + '%'
                          ) : '0%'}
                        </span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full">
                        <div
                          className="h-2 bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                          style={{ width: `${serviceHealth.filter(s => s.status === "critical").length > 0 ? (serviceHealth.filter(s => s.status === "critical").length / serviceHealth.length * 100).toFixed(2) : '0'}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Volume Widget */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Log Volume
                </CardTitle>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50" asChild>
                  <Link href="/logs">View Logs</Link>
                </Button>
              </div>
              <CardDescription>Log entries in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-[140px] bg-muted/20 rounded-md animate-pulse">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin opacity-70" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      {logVolume.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Total logs</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <span className="text-xl font-semibold text-green-500">
                        {Math.floor(logVolume * 0.7).toLocaleString()}
                      </span>
                      <p className="text-xs text-muted-foreground">Info</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xl font-semibold text-yellow-500">
                        {Math.floor(logVolume * 0.2).toLocaleString()}
                      </span>
                      <p className="text-xs text-muted-foreground">Warning</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xl font-semibold text-red-500">
                        {Math.floor(logVolume * 0.1).toLocaleString()}
                      </span>
                      <p className="text-xs text-muted-foreground">Error</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
