"use client"

import { Log, LogLevel } from "@/types/common";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface LogsAnalyticsProps {
  logs: Log[];
}

export function LogsAnalytics({ logs }: LogsAnalyticsProps) {
  // Calculate log levels distribution
  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<LogLevel, number>);

  // Calculate service distribution
  const serviceCounts = logs.reduce((acc, log) => {
    acc[log.service] = (acc[log.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get top 5 services by log count
  const topServices = Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Prepare data for log levels chart
  const levelChartData = {
    labels: Object.keys(levelCounts),
    datasets: [
      {
        data: Object.values(levelCounts),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)', // INFO - Blue
          'rgba(255, 206, 86, 0.8)', // WARN - Yellow
          'rgba(255, 99, 132, 0.8)',  // ERROR - Red
          'rgba(75, 192, 192, 0.8)',  // DEBUG - Green
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for services chart
  const serviceChartData = {
    labels: topServices.map(([service]) => service),
    datasets: [
      {
        label: 'Number of Logs',
        data: topServices.map(([, count]) => count),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const serviceChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
    maintainAspectRatio: false,
  };

  const levelChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-4">
      <Card className="md:col-span-1 lg:col-span-1">
        <CardHeader>
          <CardTitle>Log Levels Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Doughnut data={levelChartData} options={levelChartOptions} />
        </CardContent>
      </Card>

      <Card className="md:col-span-1 lg:col-span-1">
        <CardHeader>
          <CardTitle>Top Services by Log Volume</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Bar data={serviceChartData} options={serviceChartOptions} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Log Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Total Logs</div>
              <div className="text-2xl font-bold">{logs.length}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Error Rate</div>
              <div className="text-2xl font-bold">
                {((levelCounts.ERROR || 0) / logs.length * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Unique Services</div>
              <div className="text-2xl font-bold">
                {Object.keys(serviceCounts).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
