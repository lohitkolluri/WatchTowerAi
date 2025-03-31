'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Log, logsService } from '@/services/logsService';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '@/components/layouts/main-layout';
import { Calendar as CalendarType } from '@/components/ui/calendar';

// Dynamically import components that might cause SSR issues
const Calendar = dynamic<React.ComponentProps<typeof CalendarType>>(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

const Popover = dynamic(() => import('@/components/ui/popover').then(mod => mod.Popover), {
  ssr: false
});

const PopoverContent = dynamic(() => import('@/components/ui/popover').then(mod => mod.PopoverContent), {
  ssr: false
});

const PopoverTrigger = dynamic(() => import('@/components/ui/popover').then(mod => mod.PopoverTrigger), {
  ssr: false
});

export default function LogsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    service: '',
    level: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await logsService.getLogs(filters);
      setLogs(response.logs);
      setTotal(response.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch logs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const servicesList = await logsService.getServicesList();
      setServices(servicesList);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;

    try {
      await logsService.clearLogs();
      toast({
        title: 'Success',
        description: 'All logs have been cleared.',
      });
      fetchLogs();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-5 animate-in slide-in-from-top duration-500">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              System Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and analyze system logs across all services
            </p>
          </div>
          <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
            <Button
              variant="outline"
              onClick={fetchLogs}
              disabled={loading}
              className="hover:shadow-md transition-all duration-200"
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                loading && "animate-spin"
              )} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearLogs}
              disabled={loading}
              className="hover:shadow-md transition-all duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
          </div>
        </div>

        <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                />
              </div>
              <div>
                <Select
                  value={filters.service}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, service: value === 'all' ? '' : value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={filters.level}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, level: value === 'all' ? '' : value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(new Date(filters.startDate), 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate ? new Date(filters.startDate) : undefined}
                      onSelect={(date) => setFilters(prev => ({
                        ...prev,
                        startDate: date ? date.toISOString() : '',
                        page: 1
                      }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 animate-in fade-in-50">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs found
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {logs.map((log, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg border bg-card text-card-foreground hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-medium">{log.message}</p>
                              <div className="flex gap-2 text-sm text-muted-foreground">
                                <span>{format(new Date(log.timestamp), 'PPpp')}</span>
                                <span>•</span>
                                <span className={getLevelColor(log.level)}>
                                  {log.level.toUpperCase()}
                                </span>
                                <span>•</span>
                                <span>{log.service}</span>
                                {log.endpoint && (
                                  <>
                                    <span>•</span>
                                    <span>{log.endpoint}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {log.metadata && (
                            <pre className="mt-2 p-2 rounded bg-muted text-sm overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {logs.length} of {total} logs
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={filters.page === 1 || loading}
                          onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                          className="hover:shadow-md transition-all duration-200"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          disabled={logs.length < filters.limit || loading}
                          onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                          className="hover:shadow-md transition-all duration-200"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
