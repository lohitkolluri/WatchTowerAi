import { normalizeEnvironment, getEnvironmentLabel } from "@/lib/environments";

const fetchDashboardData = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const [statusResponse, alertsResponse, endpointsResponse] = await Promise.all([
      api.dashboard.getStatus(),
      api.dashboard.getAlerts(),
      api.dashboard.getEndpoints()
    ]);

    // Process endpoints and normalize environments
    const processedEndpoints = endpointsResponse.map((endpoint: any) => ({
      ...endpoint,
      environment: normalizeEnvironment(endpoint.environment)
    }));

    setDashboardData({
      status: statusResponse,
      alerts: alertsResponse,
      endpoints: processedEndpoints
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    setError("Failed to load dashboard data. Please try again later.");
  } finally {
    setIsLoading(false);
  }
}, []);

<p className="text-sm text-muted-foreground">
  {endpoint.service} ({getEnvironmentLabel(endpoint.environment)})
</p>
