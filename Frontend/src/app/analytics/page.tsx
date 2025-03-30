"use client";

import { ChangeEvent, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  successRate: number;
  peakTraffic: number;
  errorRateChange: number;
  eventsCountChange: number;
  successRateChange: number;
  peakTrafficChange: number;
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
    successRate: 0,
    peakTraffic: 0,
    errorRateChange: 0,
    eventsCountChange: 0,
    successRateChange: 0,
    peakTrafficChange: 0
  });
  const [errorRateData, setErrorRateData] = useState<Array<{ date: string; errorRate: number }>>([]);
  const [serviceErrorRates, setServiceErrorRates] = useState<ServiceErrorRate[]>([]);
  const [environmentEvents, setEnvironmentEvents] = useState<EnvironmentEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [selectedService, setSelectedService] = useState("all");
  const [selectedEnvironment, setSelectedEnvironment] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [isLiveUpdate, setIsLiveUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableEnvironments, setAvailableEnvironments] = useState<string[]>([]);

  const calculateHistoricalChanges = useCallback((currentData: MetricsData[], previousData: MetricsData[]) => {
    const current = {
      errorRate: calculateErrorRate(currentData),
      eventsCount: calculateTotalEvents(currentData),
      successRate: calculateSuccessRate(currentData),
      peakTraffic: calculatePeakTraffic(currentData)
    };

    const previous = {
      errorRate: calculateErrorRate(previousData),
      eventsCount: calculateTotalEvents(previousData),
      successRate: calculateSuccessRate(previousData),
      peakTraffic: calculatePeakTraffic(previousData)
    };

    return {
      errorRateChange: calculatePercentageChange(current.errorRate, previous.errorRate),
      eventsCountChange: calculatePercentageChange(current.eventsCount, previous.eventsCount),
      successRateChange: calculatePercentageChange(current.successRate, previous.successRate),
      peakTrafficChange: calculatePercentageChange(current.peakTraffic, previous.peakTraffic)
    };
  }, []);

  const calculateErrorRate = useCallback((data: MetricsData[]) => {
    const totalEvents = data.reduce((sum, metric) => sum + metric.total, 0);
    const totalErrors = data.reduce((sum, metric) => sum + metric.errors, 0);
    return totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0;
  }, []);

  const calculateTotalEvents = useCallback((data: MetricsData[]) => {
    return data.reduce((sum, metric) => sum + metric.total, 0);
  }, []);

  const calculateSuccessRate = useCallback((data: MetricsData[]) => {
    const totalEvents = data.reduce((sum, metric) => sum + metric.total, 0);
    const totalErrors = data.reduce((sum, metric) => sum + metric.errors, 0);
    return totalEvents > 0 ? ((totalEvents - totalErrors) / totalEvents) * 100 : 0;
  }, []);

  const calculatePeakTraffic = useCallback((data: MetricsData[]) => {
    return data.reduce((max, metric) => Math.max(max, metric.total), 0);
  }, []);

  const calculatePercentageChange = useCallback((current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, []);

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch current period data
        const currentData = await api.metrics.getAll({
          service: selectedService !== "all" ? selectedService : undefined,
          environment: selectedEnvironment !== "all" ? selectedEnvironment : undefined,
          timeRange: selectedTimeRange
        }) as unknown as MetricsData[];

        // Fetch previous period data for comparison
        const previousTimeRange = getPreviousTimeRange(selectedTimeRange);
        const previousData = await api.metrics.getAll({
          service: selectedService !== "all" ? selectedService : undefined,
          environment: selectedEnvironment !== "all" ? selectedEnvironment : undefined,
          timeRange: previousTimeRange
        }) as unknown as MetricsData[];

        if (currentData && currentData.length > 0) {
          // Extract available services and environments
          const services = [...new Set(currentData.map(m => m.service_name))];
          const environments = [...new Set(currentData.map(m => m.environment))];
          setAvailableServices(services);
          setAvailableEnvironments(environments);

          // Filter metrics based on selected service and environment
          const filteredMetrics = currentData.filter((metric: MetricsData) => {
            const serviceMatch = selectedService === "all" || metric.service_name === selectedService;
            const envMatch = selectedEnvironment === "all" || metric.environment === selectedEnvironment;
            return serviceMatch && envMatch;
          });

          // Calculate current metrics
          const totalEvents = calculateTotalEvents(filteredMetrics);
          const errorRate = calculateErrorRate(filteredMetrics);
          const successRate = calculateSuccessRate(filteredMetrics);
          const peakTraffic = calculatePeakTraffic(filteredMetrics);

          // Calculate historical changes
          const changes = calculateHistoricalChanges(filteredMetrics, previousData);

          // Update metrics state
          setMetrics({
            errorRate,
            eventsCount: totalEvents,
            successRate,
            peakTraffic,
            ...changes
          });

          // Calculate service error rates
          const serviceMetrics = calculateServiceMetrics(filteredMetrics);
          setServiceErrorRates(serviceMetrics);

          // Calculate environment events
          const envEvents = calculateEnvironmentEvents(filteredMetrics);
          setEnvironmentEvents(envEvents);

          // Calculate error rate over time
          const errorRateOverTime = calculateErrorRateOverTime(filteredMetrics);
          setErrorRateData(errorRateOverTime);

          // Calculate performance metrics
          const perfMetrics = calculatePerformanceMetrics(filteredMetrics);
          setPerformanceMetrics(perfMetrics);
        } else {
          resetMetrics();
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

    // Set up live updates
    let intervalId: NodeJS.Timeout;
    if (isLiveUpdate) {
      intervalId = setInterval(fetchAnalyticsData, 30000); // Update every 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedService, selectedEnvironment, selectedTimeRange, isLiveUpdate]);

  const calculateServiceMetrics = useCallback((data: MetricsData[]) => {
    const serviceMetrics = data.reduce((acc: ServiceMetrics, metric: MetricsData) => {
      if (!acc[metric.service_name]) {
        acc[metric.service_name] = { total: 0, errors: 0 };
      }
      acc[metric.service_name].total += metric.total;
      acc[metric.service_name].errors += metric.errors;
      return acc;
    }, {} as ServiceMetrics);

    return Object.entries(serviceMetrics).map(([service, data]) => ({
      service,
      errorRate: data.total > 0 ? (data.errors / data.total) * 100 : 0
    }));
  }, []);

  const calculateEnvironmentEvents = useCallback((data: MetricsData[]) => {
    const envMetrics = data.reduce((acc: EnvironmentMetrics, metric: MetricsData) => {
      if (!acc[metric.environment]) {
        acc[metric.environment] = 0;
      }
      acc[metric.environment] += metric.total;
      return acc;
    }, {} as EnvironmentMetrics);

    return Object.entries(envMetrics).map(([environment, events]) => ({
      environment,
      events
    }));
  }, []);

  const calculateErrorRateOverTime = useCallback((data: MetricsData[]) => {
    return data
      .sort((a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime())
      .map((metric: MetricsData) => ({
        date: formatDate(new Date(metric.last_updated)),
        errorRate: metric.total > 0 ? (metric.errors / metric.total) * 100 : 0
      }));
  }, []);

  const calculatePerformanceMetrics = useCallback((data: MetricsData[]) => {
    return data.map((metric: MetricsData) => ({
      service: metric.service_name,
      avgResponseTime: metric.log_types?.api_performance || 0
    }));
  }, []);

  const getPreviousTimeRange = useCallback((currentRange: string): string => {
    switch (currentRange) {
      case '24h':
        return '48h';
      case '7d':
        return '14d';
      case '30d':
        return '60d';
      case '90d':
        return '180d';
      default:
        return '7d';
    }
  }, []);

  const resetMetrics = () => {
    setMetrics({
      errorRate: 0,
      eventsCount: 0,
      successRate: 0,
      peakTraffic: 0,
      errorRateChange: 0,
      eventsCountChange: 0,
      successRateChange: 0,
      peakTrafficChange: 0
    });
    setServiceErrorRates([]);
    setEnvironmentEvents([]);
    setErrorRateData([]);
    setPerformanceMetrics([]);
  };

  const handleExport = async () => {
    try {
      const response = await api.metrics.getAll();
      const data = response as unknown as MetricsData[];

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
            <div className="flex items-center gap-2">
              <Label htmlFor="live-update">Live Updates</Label>
              <Switch
                id="live-update"
                checked={isLiveUpdate}
                onCheckedChange={setIsLiveUpdate}
              />
            </div>
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
            value={`${metrics.errorRate.toFixed(2)}%`}
            Icon={Activity}
          />
          <MetricCard
            title="Total Events"
            value={formatNumber(metrics.eventsCount)}
            Icon={Filter}
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate.toFixed(2)}%`}
            Icon={Clock}
          />
          <MetricCard
            title="Peak Traffic"
            value={formatNumber(metrics.peakTraffic)}
            Icon={Users}
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
                    {availableServices.map(service => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    {availableEnvironments.map(env => (
                      <SelectItem key={env} value={env}>{env}</SelectItem>
                    ))}
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
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                        domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.1))]}
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
                                      {Number(payload[0].value).toFixed(2)}%
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
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="service"
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
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                        domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.1))]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Service
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {payload[0].payload.service}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Error Rate
                                    </span>
                                    <span className="font-bold">
                                      {Number(payload[0].value).toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="errorRate"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
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
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="environment"
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
                        tickFormatter={(value) => formatNumber(value)}
                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Environment
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {payload[0].payload.environment}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Events
                                    </span>
                                    <span className="font-bold">
                                      {typeof payload[0].value === 'number' ? formatNumber(payload[0].value) : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="events"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
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
