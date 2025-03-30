"use client";

import MainLayout from "@/components/layouts/main-layout";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { AlertCircle, ChevronRight, Activity, Bell, Terminal, Settings, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Add interfaces at the top of the file
interface Alert {
  _id: string;
  message: string;
  service_name: string;
  environment: string;
  severity: string;
  status: string;
  timestamp: string;
  acknowledged: boolean;
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
}

interface ServiceHealth {
  name: string;
  status: string;
  uptime?: number;
  responseTime?: number;
}

interface ErrorRateDataPoint {
  time: string;
  errorRate: number;
  timestamp: string;
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

export default function Dashboard() {
  const [logVolume, setLogVolume] = useState<number>(0);
  const [activeAlerts, setActiveAlerts] = useState<FormattedAlert[]>([]);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [errorRateData, setErrorRateData] = useState<ErrorRateDataPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);

        // Fetch active alerts
        const alertsData = await api.alerts.getAll({ status: "active" });
        const formattedAlerts = alertsData.map((alert: Alert): FormattedAlert => ({
          id: alert._id,
          title: alert.message,
          service: alert.service_name,
          environment: alert.environment,
          severity: alert.severity,
          status: alert.status,
          timestamp: new Date(alert.timestamp),
          acknowledged: alert.acknowledged
        }));
        setActiveAlerts(formattedAlerts);

        // Fetch metrics for service health and error rate
        const metricsResponse = await api.metrics.getAll();
        const metricsData = Array.isArray(metricsResponse) ? metricsResponse :
                           metricsResponse?.metrics || metricsResponse?.data || [];

        if (metricsData.length === 0) {
          console.warn("No metrics data found");
          setServiceHealth([]);
          setErrorRateData([]);
          setLogVolume(0);
          return;
        }

        // Format service health data with better status determination
        const formattedHealth = metricsData.map((metric: Metric) => {
          const total = metric.total_requests || metric.total || 0;
          const errors = metric.errors || 0;
          const errorRate = total > 0 ? (errors / total * 100) : 0;

          // Determine status based on error rate thresholds
          let status = "healthy";
          if (errorRate >= 5) {
            status = "critical";
          } else if (errorRate > 0) {
            status = "warning";
          }

          return {
            name: metric.service_name,
            status,
            uptime: total > 0 ? 100 - errorRate : 100,
            responseTime: 0
          };
        });
        setServiceHealth(formattedHealth);

        // Aggregate error rate data by hour to avoid too many data points
        const sortedMetrics = [...metricsData].sort((a, b) => {
          const aTime = a.last_updated || a.updated_at || new Date().toISOString();
          const bTime = b.last_updated || b.updated_at || new Date().toISOString();
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        });

        // Group metrics by hour and calculate average error rate
        const hourlyMetrics = new Map<string, { total: number; errors: number; count: number }>();

        sortedMetrics.forEach((metric: Metric) => {
          const timestamp = metric.last_updated || metric.updated_at || new Date().toISOString();
          const date = new Date(timestamp);
          const hourKey = date.toISOString().slice(0, 13); // Group by hour

          const total = metric.total_requests || metric.total || 0;
          const errors = metric.errors || 0;

          const existing = hourlyMetrics.get(hourKey) || { total: 0, errors: 0, count: 0 };
          hourlyMetrics.set(hourKey, {
            total: existing.total + total,
            errors: existing.errors + errors,
            count: existing.count + 1
          });
        });

        const errorRatePoints = Array.from(hourlyMetrics.entries())
          .map(([hourKey, data]) => {
            const date = new Date(hourKey);
            return {
              time: date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }),
              errorRate: data.total > 0 ? (data.errors / data.total * 100) : 0,
              timestamp: hourKey
            };
          })
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setErrorRateData(errorRatePoints);

        // Calculate total events for log volume using the aggregated data
        const totalEvents = Array.from(hourlyMetrics.values()).reduce(
          (sum, data) => sum + data.total,
          0
        );
        setLogVolume(totalEvents);

      } catch (err: unknown) {
        console.error("Error fetching dashboard data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Add quick actions
  const quickActions = [
    { icon: Activity, label: "View Metrics", href: "/analytics" },
    { icon: Bell, label: "Manage Alerts", href: "/alerts" },
    { icon: Terminal, label: "View Logs", href: "/logs" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <action.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>Error loading dashboard data: {error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Log Volume Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
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
                  <div className="text-5xl font-bold text-primary">
                    {formatNumber(logVolume)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total logs across all services</p>
                </>
              )}
            </div>
          </div>

          {/* Error Rate Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] col-span-2">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Error Rate
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Last 24h</span>
                  <Link href="/analytics" className="text-primary hover:text-primary/80 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="h-[200px] w-full mt-4">
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
                    <div className="text-muted-foreground text-sm">Loading chart data...</div>
                  </div>
                ) : errorRateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={errorRateData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                      />
                      <YAxis
                        tickFormatter={(value: number) => `${value}%`}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error Rate']}
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="errorRate"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                          r: 6,
                          stroke: 'var(--primary)',
                          strokeWidth: 2,
                          fill: 'var(--background)'
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-sm">No error rate data available</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Alerts Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Active Alerts
                </h3>
                <Link
                  href="/alerts"
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="border-b pb-4 last:border-0 last:pb-0 space-y-2">
                      <div className="h-5 bg-muted/50 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-muted/50 rounded w-1/2 animate-pulse" />
                    </div>
                  ))
                ) : activeAlerts.length > 0 ? (
                  activeAlerts.map((alert) => (
                    <div key={alert.id} className="border-b pb-4 last:border-0 last:pb-0 group">
                      <Link href={`/alerts/${alert.id}`} className="block">
                        <div className="flex justify-between items-start group-hover:opacity-80 transition-opacity">
                          <div className="flex items-start gap-2">
                            <AlertCircle className={`h-5 w-5 ${
                              alert.severity === 'critical' ? 'text-destructive' :
                              alert.severity === 'warning' ? 'text-yellow-500' :
                              'text-primary'
                            } mt-0.5`} />
                            <div>
                              <div className="font-medium">{alert.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {alert.service}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center justify-center py-8">
                    <div className="text-center">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No active alerts</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service Health Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] col-span-2">
            <div className="p-6">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Service Health
              </h3>
              <div className="mt-4 space-y-4">
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="h-5 bg-muted/50 rounded w-1/3 animate-pulse" />
                        <div className="h-5 bg-muted/50 rounded w-20 animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : serviceHealth.length > 0 ? (
                  serviceHealth.map((service) => (
                    <div key={service.name} className="border-b pb-4 last:border-0 last:pb-0 hover:bg-muted/5 -mx-6 px-6 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{service.name}</span>
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${
                            service.status === 'critical' ? 'bg-destructive animate-pulse' :
                            service.status === 'warning' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                          }`} />
                          <span className={`text-sm ${
                            service.status === 'critical' ? 'text-destructive' :
                            service.status === 'warning' ? 'text-yellow-500' : 'text-green-600'
                          }`}>
                            {service.status === 'critical' ? 'Critical' : service.status === 'warning' ? 'Warning' : 'Healthy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center justify-center py-8">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No service health data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
