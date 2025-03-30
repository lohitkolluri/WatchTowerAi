"use client";

import { ReactNode } from "react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { AlertCircle, ChevronRight, Activity, Bell, Terminal, Settings, ExternalLink, BarChart2, ArrowUpRight, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Line as LineChart } from 'react-chartjs-2';
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
import { Service, Alert, ServiceHealth } from '@/types/common';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

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
  timestamp: string;
  errorRate: number;
}

interface Log {
  timestamp: string;
  level: string;
  message: string;
  service: string;
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
}

interface QuickAction {
  icon: any;
  label: string;
  href: string;
}

const ErrorRateCard = ({ data, isLoading }: { data: ErrorRateDataPoint[], isLoading: boolean }) => {
  const chartData = {
    labels: data.map(point => format(new Date(point.timestamp), 'HH:mm')),
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
          label: function(context: any) {
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
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Error Rate</CardTitle>
          <Link href="/analytics" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            <div className="flex items-center gap-1">
              View Analytics
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            No error rate data available
          </div>
        ) : (
          <LineChart data={chartData} options={options} />
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [logVolume, setLogVolume] = useState<number>(0);
  const [activeAlerts, setActiveAlerts] = useState<FormattedAlert[]>([]);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
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
          const healthData: ServiceHealth[] = services.map((service: Service) => ({
            name: service.name,
            status: service.status || 'healthy',
            metrics: service.metrics || null
          }));

          setServiceHealth(healthData);
        }

        // Fetch and format alerts
        const alertsResponse = await api.alerts.getAll();
        const formattedAlerts = Array.isArray(alertsResponse)
          ? alertsResponse
          : alertsResponse?.alerts || [];

        if (!formattedAlerts || formattedAlerts.length === 0) {
          console.warn('No alerts found');
          setActiveAlerts([]);
        } else {
          setActiveAlerts(formattedAlerts.map((alert: Alert): FormattedAlert => ({
            id: alert._id,
            title: alert.message,
            service: alert.service_name,
            environment: alert.environment,
            severity: alert.severity,
            status: alert.status,
            timestamp: new Date(alert.timestamp),
            acknowledged: alert.acknowledged
          })));
        }

        // Fetch log volume
        const logsData = await api.logs.getAll();
        setLogVolume(logsData.length || 0);

        // Fetch metrics for service health and error rate
        const metricsResponse = await api.metrics.getAll();
        console.log('Metrics response:', metricsResponse);
        const metricsData = Array.isArray(metricsResponse) ? metricsResponse :
                           metricsResponse?.metrics || metricsResponse?.data || [];

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

  return (
    <MainLayout>
      <div className="grid gap-4">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-left-5">Dashboard</h1>
              <p className="text-muted-foreground mt-1 animate-in fade-in slide-in-from-left-5 delay-100">Monitor your services in real-time</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 animate-in fade-in slide-in-from-right-5">
              {quickActions.map((action, index) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-all duration-200 animate-in fade-in slide-in-from-right-5 text-black"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <action.icon className="h-4 w-4 transition-transform group-hover:scale-110 text-black group-hover:text-primary-foreground" />
                  <span className="text-sm font-medium hidden sm:inline text-black group-hover:text-primary-foreground">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 animate-pulse" />
                <p>Error loading dashboard data: {error}</p>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Log Volume Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] relative overflow-hidden group animate-in fade-in-50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-2 right-2">
                <Link href="/logs" className="text-muted-foreground hover:text-primary transition-colors">
                  <ArrowUpRight className="h-4 w-4 group-hover:scale-110 transition-transform" />
                </Link>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  Log Volume
                </h3>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-8 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      {formatNumber(logVolume)}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <BarChart2 className="h-4 w-4" />
                      Total logs across all services
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Error Rate Card */}
            <ErrorRateCard data={errorRateData} isLoading={isLoading} />

            {/* Active Alerts Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Link href="/alerts" className="text-muted-foreground hover:text-primary transition-colors">
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Active Alerts
                    {!isLoading && activeAlerts.length > 0 && (
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        {activeAlerts.length}
                      </span>
                    )}
                  </h3>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 bg-muted/50 rounded animate-pulse" />
                    <div className="h-12 bg-muted/50 rounded animate-pulse" />
                  </div>
                ) : activeAlerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No active alerts</div>
                ) : (
                  <div className="space-y-4">
                    {activeAlerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-start gap-4">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{alert.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{alert.service}</span>
                            <span>•</span>
                            <span>{format(alert.timestamp, 'HH:mm')}</span>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.severity === 'critical'
                            ? 'bg-destructive/10 text-destructive'
                            : alert.severity === 'warning'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {alert.severity}
                        </div>
                      </div>
                    ))}
                    {activeAlerts.length > 5 && (
                      <Link
                        href="/alerts"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        View all alerts
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service Health Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Service Health
                </h3>
                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`loading-service-${index}`} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
                        <div className="h-4 w-4 bg-muted/50 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : serviceHealth.length === 0 ? (
                <div className="text-sm text-muted-foreground">No services found</div>
              ) : (
                <div className="space-y-3">
                  {serviceHealth.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {service.metrics?.uptime !== undefined && (
                          <span className="text-sm text-muted-foreground">
                            Uptime: {service.metrics.uptime.toFixed(1)}%
                          </span>
                        )}
                        {service.metrics?.responseTime !== undefined && (
                          <span className="text-sm text-muted-foreground">
                            Response: {service.metrics.responseTime.toFixed(0)}ms
                          </span>
                        )}
                        <div
                          className={`h-2 w-2 rounded-full ${
                            service.status === "healthy"
                              ? "bg-green-500"
                              : service.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                  {serviceHealth.length > 5 && (
                    <Link
                      href="/services"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      View all services
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
