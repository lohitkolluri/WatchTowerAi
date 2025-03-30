"use client";

import { ChangeEvent } from "react";
import MainLayout from "@/components/layouts/main-layout";
import { Calendar, Download, Filter, Search, ArrowUp, ArrowDown, Activity, Users, Clock, LucideIcon } from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface MetricsData {
  _id: string;
  service_name: string;
  environment: string;
  total: number;
  errors: number;
  last_updated: string;
  log_types?: {
    [key: string]: number;
  };
  log_subtypes?: {
    [key: string]: {
      [key: string]: number;
    };
  };
}

interface ServiceErrorRate {
  service: string;
  errorRate: number;
}

interface EnvironmentEvent {
  environment: string;
  events: number;
}

interface PerformanceMetric {
  service: string;
  avgResponseTime: number;
}

interface MetricState {
  errorRate: number;
  eventsCount: number;
  activeUsers: number;
  avgResponseTime: number;
  errorRateChange: number;
  eventsCountChange: number;
  activeUsersChange: number;
  avgResponseTimeChange: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  Icon: LucideIcon;
}

interface ServiceMetrics {
  [key: string]: {
    total: number;
    errors: number;
  };
}

interface EnvironmentMetrics {
  [key: string]: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricState>({
    errorRate: 0,
    eventsCount: 0,
    activeUsers: 0,
    avgResponseTime: 0,
    errorRateChange: 0,
    eventsCountChange: 0,
    activeUsersChange: 0,
    avgResponseTimeChange: 0
  });
  const [errorRateData, setErrorRateData] = useState<Array<{ date: string; errorRate: number }>>([]);
  const [serviceErrorRates, setServiceErrorRates] = useState<ServiceErrorRate[]>([]);
  const [environmentEvents, setEnvironmentEvents] = useState<EnvironmentEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [selectedService, setSelectedService] = useState("all");
  const [selectedEnvironment, setSelectedEnvironment] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        setIsLoading(true);
        setError(null);

        const metricsData = await api.metrics.getAll({
          service: selectedService !== "all" ? selectedService : undefined,
          environment: selectedEnvironment !== "all" ? selectedEnvironment : undefined,
          timeRange: selectedTimeRange
        }) as MetricsData[];

        if (metricsData && metricsData.length > 0) {
          // Filter metrics based on selected service and environment
          const filteredMetrics = metricsData.filter((metric: MetricsData) => {
            const serviceMatch = selectedService === "all" || metric.service_name === selectedService;
            const envMatch = selectedEnvironment === "all" || metric.environment === selectedEnvironment;
            return serviceMatch && envMatch;
          });

          // Calculate current metrics
          const totalEvents = filteredMetrics.reduce((sum: number, metric: MetricsData) => sum + metric.total, 0);
          const totalErrors = filteredMetrics.reduce((sum: number, metric: MetricsData) => sum + metric.errors, 0);
          const errorRate = totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0;

          // Calculate service error rates
          const serviceMetrics = filteredMetrics.reduce((acc: ServiceMetrics, metric: MetricsData) => {
            if (!acc[metric.service_name]) {
              acc[metric.service_name] = { total: 0, errors: 0 };
            }
            acc[metric.service_name].total += metric.total;
            acc[metric.service_name].errors += metric.errors;
            return acc;
          }, {} as ServiceMetrics);

          const serviceErrorRatesData = Object.entries(serviceMetrics).map(([service, data]) => ({
            service,
            errorRate: (data as { total: number; errors: number }).total > 0 ? ((data as { total: number; errors: number }).errors / (data as { total: number; errors: number }).total) * 100 : 0
          }));

          // Calculate environment events
          const environmentMetrics = filteredMetrics.reduce((acc: EnvironmentMetrics, metric: MetricsData) => {
            if (!acc[metric.environment]) {
              acc[metric.environment] = 0;
            }
            acc[metric.environment] += metric.total;
            return acc;
          }, {} as EnvironmentMetrics);

          const environmentEventsData = Object.entries(environmentMetrics).map(([environment, events]) => ({
            environment,
            events: events as number
          }));

          // Calculate error rate over time
          const errorRateOverTime = filteredMetrics.map((metric: MetricsData) => ({
            date: formatDate(new Date(metric.last_updated)),
            errorRate: metric.total > 0 ? (metric.errors / metric.total) * 100 : 0
          }));

          // Update state
          setMetrics({
            errorRate,
            eventsCount: totalEvents,
            activeUsers: filteredMetrics.reduce((sum, metric) => sum + (metric.log_types?.auth || 0), 0),
            avgResponseTime: filteredMetrics.reduce((sum, metric) => {
              const apiPerf = metric.log_types?.api_performance || 0;
              return sum + apiPerf;
            }, 0) / filteredMetrics.length || 0,
            errorRateChange: 0, // We'll calculate this when we implement historical data
            eventsCountChange: 0,
            activeUsersChange: 0,
            avgResponseTimeChange: 0
          });

          setServiceErrorRates(serviceErrorRatesData);
          setEnvironmentEvents(environmentEventsData);
          setErrorRateData(errorRateOverTime);
        } else {
          // Reset metrics if no data
          setMetrics({
            errorRate: 0,
            eventsCount: 0,
            activeUsers: 0,
            avgResponseTime: 0,
            errorRateChange: 0,
            eventsCountChange: 0,
            activeUsersChange: 0,
            avgResponseTimeChange: 0
          });
          setServiceErrorRates([]);
          setEnvironmentEvents([]);
          setErrorRateData([]);
        }
      } catch (err: unknown) {
        console.error("Error fetching analytics data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        toast.error("Failed to fetch analytics data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [selectedService, selectedEnvironment, selectedTimeRange]);

  const handleExport = async () => {
    try {
      const response = await api.metrics.getAll();
      const data = response.data as MetricsData[];

      // Convert data to CSV format
      const csvContent = [
        ["Last Updated", "Service", "Environment", "Total Events", "Errors", "Error Rate", "Log Types"].join(","),
        ...data.map(row => [
          row.last_updated,
          row.service_name,
          row.environment,
          row.total,
          row.errors,
          row.total > 0 ? ((row.errors / row.total) * 100).toFixed(2) + '%' : '0%',
          row.log_types ? JSON.stringify(row.log_types) : 'N/A'
        ].join(","))
      ].join("\n");

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `analytics_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    } catch (error) {
      console.error("Failed to export analytics data:", error);
      toast.error("Failed to export analytics data");
    }
  };

  const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, Icon }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {change !== undefined && (
          <div className={`flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span className="text-xs">{Math.abs(change)}%</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your application performance and usage metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Error Rate"
            value={`${metrics.errorRate}%`}
            change={metrics.errorRateChange}
            Icon={Activity}
          />
          <MetricCard
            title="Total Events"
            value={formatNumber(metrics.eventsCount)}
            change={metrics.eventsCountChange}
            Icon={Filter}
          />
          <MetricCard
            title="Active Users"
            value={formatNumber(metrics.activeUsers)}
            change={metrics.activeUsersChange}
            Icon={Users}
          />
          <MetricCard
            title="Avg. Response Time"
            value={`${metrics.avgResponseTime} ms`}
            change={metrics.avgResponseTimeChange}
            Icon={Clock}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Error Rate Over Time</CardTitle>
              <CardDescription>Track error rate trends across your services</CardDescription>
              <div className="flex gap-4">
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={errorRateData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
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
                        tickFormatter={(value: number | string | undefined) => {
                          if (typeof value === 'number') {
                            return value.toFixed(0);
                          }
                          return '0';
                        }}
                        domain={[
                          0,
                          (dataMax: number | string | undefined) => {
                            if (typeof dataMax === 'number') {
                              return Math.ceil(dataMax * 1.1);
                            }
                            return 100; // Default maximum if value is undefined or not a number
                          }
                        ]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Date
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {payload[0].payload.date}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Error Rate
                                    </span>
                                    <span className="font-bold">
                                      {payload[0].value}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="errorRate"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Error Rates</CardTitle>
              <CardDescription>Compare error rates across different services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceErrorRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="service" />
                      <YAxis
                        tickFormatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)}%` : '0%')}
                        domain={[0, 'dataMax']}
                      />
                      <Tooltip />
                      <Bar dataKey="errorRate" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Events</CardTitle>
              <CardDescription>Event distribution across environments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={environmentEvents}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="environment" />
                      <YAxis
                        tickFormatter={(value) => (typeof value === 'number' ? value.toFixed(0) : '0')}
                        domain={[0, 'dataMax']}
                      />
                      <Tooltip />
                      <Bar dataKey="events" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
