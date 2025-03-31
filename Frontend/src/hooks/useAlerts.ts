import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Alert, FormattedAlert } from '../types/common';

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const alertsResponse = await api.alerts.getAll();
        const alerts = Array.isArray(alertsResponse)
          ? alertsResponse
          : alertsResponse?.alerts || [];

        return alerts.map((alert: Alert): FormattedAlert => ({
          id: alert._id,
          title: alert.message,
          service: alert.service_name,
          environment: alert.environment,
          severity: alert.severity,
          status: alert.status,
          timestamp: new Date(alert.timestamp),
          acknowledged: alert.acknowledged
        }));
      } catch (error: any) {
        if (error.statusCode === 404) {
          return [];
        }
        throw new Error(`Failed to fetch alerts: ${error.message}`);
      }
    },
    retry: 2,
    staleTime: 15000, // Consider data fresh for 15 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
