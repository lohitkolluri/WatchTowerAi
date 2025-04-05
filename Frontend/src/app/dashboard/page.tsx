'use client';

import { useCallback, useState } from 'react';
import { normalizeEnvironment, getEnvironmentLabel } from "@/lib/environments";
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    metrics: any[];
    alerts: any[];
    endpoints: any[];
  }>({
    metrics: [],
    alerts: [],
    endpoints: []
  });

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsResponse, alertsResponse] = await Promise.all([
        api.metrics.getAll(),
        api.alerts.getAll()
      ]);

      // Process metrics and normalize environments
      const processedMetrics = metricsResponse.map((metric: any) => ({
        ...metric,
        environment: normalizeEnvironment(metric.environment)
      }));

      setDashboardData({
        metrics: processedMetrics,
        alerts: alertsResponse.data,
        endpoints: processedMetrics // Using metrics as endpoints since they contain service info
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div>
      {dashboardData.endpoints.map((endpoint, index) => (
        <p key={index} className="text-sm text-muted-foreground">
          {endpoint.service} ({getEnvironmentLabel(endpoint.environment)})
        </p>
      ))}
    </div>
  );
}
