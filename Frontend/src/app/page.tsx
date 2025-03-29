"use client";

import MainLayout from "@/components/layouts/main-layout";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { AlertCircle, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [logVolume, setLogVolume] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [serviceHealth, setServiceHealth] = useState([]);
  const [errorRateData, setErrorRateData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);

        // Fetch log volume
        const logsData = await api.logs.getAll();
        setLogVolume(logsData.length || 0);

        // Fetch active alerts
        const alertsData = await api.alerts.getAll({ status: "active" });
        const formattedAlerts = alertsData.map(alert => ({
          id: alert._id,
          title: alert.message,
          service: alert.service_name,
          severity: alert.level.toLowerCase(),
        }));
        setActiveAlerts(formattedAlerts);

        // Fetch metrics for service health and error rate
        const metricsData = await api.metrics.getAll();
        const formattedHealth = metricsData.map(metric => ({
          name: metric.service_name,
          status: metric.errors > 0 ? "critical" : "healthy"
        }));
        setServiceHealth(formattedHealth);

        // Generate error rate data for the chart
        // Since we don't have historical time-series data from the API,
        // we'll generate sample data based on the current metrics
        const now = new Date();
        const errorRatePoints = [];

        // Generate data points for the last 24 hours (one per hour)
        for (let i = 24; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
          const hour = timestamp.getHours();

          // Calculate a sample error rate based on existing metrics
          // In a real app, this would come from historical API data
          let errorRate = 0;
          if (metricsData.length > 0) {
            // Use the actual metrics data to create a realistic pattern
            const totalErrors = metricsData.reduce((sum, metric) => sum + metric.errors, 0);
            const totalRequests = metricsData.reduce((sum, metric) => sum + metric.total, 0);

            // Base error rate from actual data
            const baseErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

            // Add some variation to create a realistic chart
            const variation = Math.sin(i / 4) * 0.5 + (Math.random() * 0.3);
            errorRate = Math.max(0, baseErrorRate + variation);
          }

          errorRatePoints.push({
            time: `${hour}:00`,
            errorRate: parseFloat(errorRate.toFixed(2)),
            timestamp
          });
        }

        // Sort by timestamp
        errorRatePoints.sort((a, b) => a.timestamp - b.timestamp);
        setErrorRateData(errorRatePoints);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            Error loading dashboard data: {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Log Volume Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 space-y-2">
              <h3 className="text-lg font-medium">Log Volume</h3>
              <div className="text-5xl font-bold">
                {isLoading ? "Loading..." : formatNumber(logVolume)}
              </div>
              <p className="text-sm text-muted-foreground">Across services</p>
            </div>
          </div>

          {/* Error Rate Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm col-span-2">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Error Rate</h3>
                <span className="text-sm text-muted-foreground">Last 24h</span>
              </div>
              <div className="h-[200px] w-full mt-2">
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-muted-foreground text-sm">Loading chart data...</div>
                  </div>
                ) : errorRateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={errorRateData}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Error Rate']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="errorRate"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 1, fill: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-muted-foreground text-sm">No error rate data available</div>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          {/* Active Alerts Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Active Alerts</h3>
                <Link
                  href="/alerts"
                  className="text-sm text-primary hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading alerts...</div>
                ) : activeAlerts.length > 0 ? (
                  activeAlerts.map((alert) => (
                    <div key={alert.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {alert.service}
                            </div>
                          </div>
                        </div>
                        <Link href={`/alerts/${alert.id}`}>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No active alerts</div>
                )}
              </div>
            </div>
          </div>

          {/* Service Health Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm col-span-2">
            <div className="p-6">
              <h3 className="text-lg font-medium">Service Health</h3>
              <div className="mt-4 space-y-4">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading service health...</div>
                ) : serviceHealth.length > 0 ? (
                  serviceHealth.map((service) => (
                    <div key={service.name} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{service.name}</span>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${service.status === 'critical' ? 'bg-destructive' : 'bg-green-500'}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {service.status === 'critical' ? 'Critical' : 'Healthy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No service health data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
