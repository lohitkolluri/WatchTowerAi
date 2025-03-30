import { subDays, format } from 'date-fns';

export interface MetricsData {
  total: number;
  errors: number;
  active_users: number;
  avg_response_time: number;
  service?: string;
  environment?: string;
  timestamp: string;
}

const services = ['frontend', 'backend', 'database', 'auth'];
const environments = ['production', 'staging', 'development'];

function generateRandomMetric(date: Date, service?: string, environment?: string): MetricsData {
  const total = Math.floor(Math.random() * 1000) + 100;
  const errors = Math.floor(Math.random() * (total * 0.2)); // Up to 20% error rate
  const active_users = Math.floor(Math.random() * 500) + 50;
  const avg_response_time = Math.floor(Math.random() * 200) + 50;

  return {
    total,
    errors,
    active_users,
    avg_response_time,
    service: service || services[Math.floor(Math.random() * services.length)],
    environment: environment || environments[Math.floor(Math.random() * environments.length)],
    timestamp: format(date, 'yyyy-MM-dd HH:mm:ss')
  };
}

export function generateMockData(days: number = 7, service?: string, environment?: string): MetricsData[] {
  const data: MetricsData[] = [];
  const now = new Date();

  // Generate data points for each day
  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i);
    // Generate multiple data points per day
    for (let hour = 0; hour < 24; hour += 2) {
      const dataPoint = generateRandomMetric(
        new Date(date.setHours(hour)),
        service,
        environment
      );
      data.push(dataPoint);
    }
  }

  return data;
}

export const mockDataService = {
  getMetrics: async (params?: { service?: string; environment?: string; timeRange?: string }) => {
    const days = params?.timeRange === '24h' ? 1 :
                params?.timeRange === '7d' ? 7 :
                params?.timeRange === '30d' ? 30 : 90;

    return generateMockData(days, params?.service, params?.environment);
  }
};
