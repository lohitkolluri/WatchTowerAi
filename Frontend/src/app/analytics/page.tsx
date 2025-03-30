"use client";

import MainLayout from "@/components/layouts/main-layout";
import { Calendar, Download, Filter, Search } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState({
    errorRate: 0,
    eventsCount: 0,
    activeUsers: 0,
    avgResponseTime: 0
  });
  const [errorRateData, setErrorRateData] = useState([]);
  const [serviceErrorRates, setServiceErrorRates] = useState([]);
  const [environmentEvents, setEnvironmentEvents] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [selectedService, setSelectedService] = useState("all");
  const [selectedEnvironment, setSelectedEnvironment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        setIsLoading(true);

        // Fetch metrics data from the API
        const metricsData = await api.metrics.getAll({
          service: selectedService !== "all" ? selectedService : undefined,
          environment: selectedEnvironment !== "all" ? selectedEnvironment : undefined
        });

        if (metricsData && metricsData.length > 0) {
          // Calculate overall metrics
          let totalEvents = 0;
          let totalErrors = 0;
          let totalServices = new Set();
          let responseTimesSum = 0;
          let responseTimesCount = 0;

          // Process metrics by service for error rates
          const serviceMap = new Map();
          const environmentMap = new Map();
          const performanceMap = new Map();

          metricsData.forEach(metric => {
            // Count total events and errors
            totalEvents += metric.total || 0;
            totalErrors += metric.errors || 0;
            totalServices.add(metric.service_name);

            // Track metrics by service
            if (!serviceMap.has(metric.service_name)) {
              serviceMap.set(metric.service_name, { total: 0, errors: 0 });
            }
            const serviceStats = serviceMap.get(metric.service_name);
            serviceStats.total += metric.total || 0;
            serviceStats.errors += metric.errors || 0;

            // Track metrics by environment
            if (!environmentMap.has(metric.environment)) {
              environmentMap.set(metric.environment, 0);
            }
            environmentMap.set(metric.environment, environmentMap.get(metric.environment) + (metric.total || 0));

            // If there's response time data available (assuming it might be in the API)
            if (metric.avg_response_time) {
              responseTimesSum += metric.avg_response_time;
              responseTimesCount++;

              if (!performanceMap.has(metric.service_name)) {
                performanceMap.set(metric.service_name, { sum: 0, count: 0 });
              }
              const perfStats = performanceMap.get(metric.service_name);
              perfStats.sum += metric.avg_response_time;
              perfStats.count++;
            }
          });

          // Calculate overall error rate
          const overallErrorRate = totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0;

          // Update the metrics state with real data only
          setMetrics({
            errorRate: parseFloat(overallErrorRate.toFixed(2)),
            eventsCount: totalEvents,
            activeUsers: metricsData.reduce((sum, metric) => sum + (metric.active_users || 0), 0),
            avgResponseTime: responseTimesCount > 0 ? Math.round(responseTimesSum / responseTimesCount) : 0
          });

          // Format service error rates
          const serviceErrorRatesData = Array.from(serviceMap.entries()).map(([service, stats]) => ({
            service,
            errorRate: stats.total > 0 ? parseFloat(((stats.errors / stats.total) * 100).toFixed(2)) : 0
          }));
          setServiceErrorRates(serviceErrorRatesData);

          // Format environment events
          const environmentEventsData = Array.from(environmentMap.entries()).map(([environment, events]) => ({
            environment,
            events
          }));
          setEnvironmentEvents(environmentEventsData);

          // Format performance metrics using only real data
          const performanceData = Array.from(performanceMap.entries()).map(([service, stats]) => ({
            service,
            avgResponseTime: stats.count > 0 ? Math.round(stats.sum / stats.count) : 0
          }));

          // Only use real performance data, no mock data
          setPerformanceMetrics(performanceData);

          // If no performance data is available, the UI will show an empty state

          // Use real error rate data from the API if available
          // Check if the API response includes historical error rate data
          if (metricsData.some(metric => metric.historical_error_rates)) {
            const errorRatePoints = [];

            // Process historical data from the API
            metricsData.forEach(metric => {
              if (metric.historical_error_rates && Array.isArray(metric.historical_error_rates)) {
                metric.historical_error_rates.forEach(point => {
                  const date = new Date(point.timestamp);
                  const day = date.getDate();
                  const month = date.toLocaleString('default', { month: 'short' });

                  errorRatePoints.push({
                    date: `${month} ${day}`,
                    errorRate: parseFloat(point.error_rate.toFixed(2)),
                    timestamp: date,
                    service: metric.service_name
                  });
                });
              }
            });

            // Sort by timestamp
            errorRatePoints.sort((a, b) => a.timestamp - b.timestamp);
            setErrorRateData(errorRatePoints);
          } else {
            // If no historical data is available, use an empty array
            setErrorRateData([]);
          }
        } else {
          // If no data is returned, set default values
          setMetrics({
            errorRate: 0,
            eventsCount: 0,
            activeUsers: 0,
            avgResponseTime: 0
          });
          setServiceErrorRates([]);
          setEnvironmentEvents([]);
          setPerformanceMetrics([]);
          setErrorRateData([]);
        }
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [selectedService, selectedEnvironment]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            Error loading analytics data: {error}
          </div>
        )}

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Error Rate</h3>
            <p className="text-3xl font-bold">{metrics.errorRate}%</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Events</h3>
            <p className="text-3xl font-bold">{formatNumber(metrics.eventsCount)}</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Active Users</h3>
            <p className="text-3xl font-bold">{formatNumber(metrics.activeUsers)}</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Avg, Response</h3>
            <p className="text-3xl font-bold">{metrics.avgResponseTime} ms</p>
          </div>
        </div>

        {/* Error Rate Chart */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Error Rate Over Time</h3>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  className="rounded-md border border-input bg-background px-8 py-2 text-sm appearance-none"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <option value="all">All Services</option>
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                  <option value="database">Database</option>
                </select>
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <span className="text-sm text-muted-foreground">Service</span>
                </div>
              </div>
              <div className="relative">
                <select
                  className="rounded-md border border-input bg-background px-8 py-2 text-sm appearance-none"
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                >
                  <option value="all">All Environments</option>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <span className="text-sm text-muted-foreground">Environment</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[200px] w-full">
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
                    dataKey="date"
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
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 1, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-muted-foreground text-sm">No error rate data available</div>
              </div>
            )}
          </div>
        </div>

        {/* Data Tables */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Error Rate by Service */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-medium">Error Rate by Service</h3>
            </div>
            <div className="border-t">
              <div className="grid grid-cols-2 bg-muted/50 p-3">
                <div className="text-sm font-medium">Service</div>
                <div className="text-sm font-medium">Error Rate</div>
              </div>
              {serviceErrorRates.map((item, index) => (
                <div key={index} className="grid grid-cols-2 p-3 border-t">
                  <div className="text-sm">{item.service}</div>
                  <div className="text-sm">{item.errorRate}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Events by Environment */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-medium">Events by Environment</h3>
            </div>
            <div className="border-t">
              <div className="grid grid-cols-2 bg-muted/50 p-3">
                <div className="text-sm font-medium">Environment</div>
                <div className="text-sm font-medium">Events</div>
              </div>
              {environmentEvents.map((item, index) => (
                <div key={index} className="grid grid-cols-2 p-3 border-t">
                  <div className="text-sm">{item.environment}</div>
                  <div className="text-sm">{formatNumber(item.events)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-6 flex justify-between items-center">
            <h3 className="text-lg font-medium">Performance Metrics</h3>
            <button className="text-sm text-primary hover:underline">Export</button>
          </div>
          <div className="border-t">
            <div className="grid grid-cols-2 bg-muted/50 p-3">
              <div className="text-sm font-medium">Service</div>
              <div className="text-sm font-medium">Avg, Response Time</div>
            </div>
            {performanceMetrics.map((item, index) => (
              <div key={index} className="grid grid-cols-2 p-3 border-t">
                <div className="text-sm">{item.service}</div>
                <div className="text-sm">{item.avgResponseTime} ms</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
