'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  AlertCircle,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  Download,
  FileJson,
  Info,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Server,
  Shield,
  Slash,
  Trash2,
  AlertTriangle,
  XCircle,
  Copy,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Log } from '@/types/common';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '@/components/layouts/main-layout';
import { Calendar as CalendarType } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import debounce from 'lodash/debounce';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import components that might cause SSR issues
const Calendar = dynamic<React.ComponentProps<typeof CalendarType>>(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
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

// Add a new function for copying to clipboard
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ description: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
    >
      {copied ? (
        <CheckCheck className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </Button>
  );
};

interface FormattedMetadata {
  key: string;
  value: string | unknown;
}

const formatData = (data: unknown): FormattedMetadata[] | string => {
  try {
    if (typeof data === 'object' && data !== null) {
      // Format each field in a more readable way
      const formattedData = Object.entries(data).map(([key, value]): FormattedMetadata => {
        let formattedValue: string | unknown = value;
        if (typeof value === 'object' && value !== null) {
          formattedValue = JSON.stringify(value, null, 2);
        } else if (typeof value === 'string' && value.length > 100) {
          formattedValue = value.substring(0, 100) + '...';
        }
        return { key, value: formattedValue };
      });
      return formattedData;
    }
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
};

export default function LogsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [allLogs, setAllLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [filters, setFilters] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    service: searchParams.get('service') || '',
    level: searchParams.get('level') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    search: searchParams.get('search') || '',
  });

  // Function to apply filters to logs
  const applyFilters = useCallback((logs: Log[], currentFilters: typeof filters) => {
    return logs.filter(log => {
      // Search filter
      if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        const messageMatch = (log.message || '').toLowerCase().includes(searchLower);
        const serviceMatch = (log.service || '').toLowerCase().includes(searchLower);
        const levelMatch = (log.level || '').toLowerCase().includes(searchLower);
        const endpointMatch = (log.endpoint || '').toLowerCase().includes(searchLower);
        if (!messageMatch && !serviceMatch && !levelMatch && !endpointMatch) {
          return false;
        }
      }

      // Service filter
      if (currentFilters.service && (!log.service || log.service !== currentFilters.service)) {
        return false;
      }

      // Level filter
      if (currentFilters.level && (!log.level || log.level.toLowerCase() !== currentFilters.level.toLowerCase())) {
        return false;
      }

      // Date filter
      if (currentFilters.startDate && log.timestamp) {
        const startDate = new Date(currentFilters.startDate);
        startDate.setHours(0, 0, 0, 0); // Set to start of day
        const logDate = new Date(log.timestamp);
        if (logDate < startDate) {
          return false;
        }
      }

      if (currentFilters.endDate && log.timestamp) {
        const endDate = new Date(currentFilters.endDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of day
        const logDate = new Date(log.timestamp);
        if (logDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, []);

  // Effect to handle filtering
  useEffect(() => {
    const filtered = applyFilters(allLogs, filters);
    setFilteredLogs(filtered);
    setTotal(filtered.length);

    // Update URL with current filters
    const url = new URL(window.location.href);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value.toString());
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.pushState({}, '', url.toString());
  }, [filters, allLogs, applyFilters]);

  // Debounced search function with proper cleanup
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
      setSearching(false);
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setSearching(true);
    debouncedSearch(searchTerm);
  };

  const clearSearch = () => {
    const searchInput = document.querySelector('input[placeholder="Search logs..."]') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    setFilters(prev => ({ ...prev, search: '', page: 1 }));
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.logs.getAll();

      // Sort logs by timestamp in descending order (newest first)
      const sortedLogs = response.data.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setAllLogs(sortedLogs);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch logs. Please try again.',
        variant: 'destructive',
      });
      setAllLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [toast]);

  // Get paginated logs
  const getPaginatedLogs = useCallback(() => {
    const start = (filters.page - 1) * filters.limit;
    const end = start + filters.limit;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, filters.page, filters.limit]);

  // Effect to fetch logs initially and set up services
  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const fetchServices = useCallback(() => {
    // Get unique services from allLogs
    const uniqueServices = Array.from(new Set(allLogs.map(log => log.service))).filter(Boolean);
    setServices(uniqueServices.sort());
  }, [allLogs]);

  // Effect to update services when logs change
  useEffect(() => {
    fetchServices();
  }, [allLogs, fetchServices]);

  // Update filters when URL params change
  useEffect(() => {
    const newFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      service: searchParams.get('service') || '',
      level: searchParams.get('level') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      search: searchParams.get('search') || '',
    };

    // Only update if filters have actually changed
    if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
      setFilters(newFilters);
    }
  }, [searchParams]);

  const handleSearch = () => {
    setSearching(true);
    const searchInput = document.querySelector('input[placeholder="Search logs..."]') as HTMLInputElement;
    if (searchInput) {
      debouncedSearch(searchInput.value);
    }
    setSearching(false);
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined, type: 'start' | 'end') => {
    if (date) {
      const dateStr = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      setFilters(prev => ({
        ...prev,
        [type === 'start' ? 'startDate' : 'endDate']: dateStr,
        page: 1
      }));
    }
  };

  // Handle service selection
  const handleServiceSelect = (value: string) => {
    setFilters(prev => ({
      ...prev,
      service: value === 'all' ? '' : value,
      page: 1
    }));
  };

  // Handle level selection
  const handleLevelSelect = (value: string) => {
    setFilters(prev => ({
      ...prev,
      level: value === 'all' ? '' : value,
      page: 1
    }));
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;

    try {
      await api.logs.clear();
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

  const handleExportLogs = () => {
    try {
      // Generate a JSON string containing the logs
      const jsonData = JSON.stringify(getPaginatedLogs(), null, 2);

      // Create a blob from the JSON string
      const blob = new Blob([jsonData], { type: 'application/json' });

      // Create an object URL for the blob
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;

      // Trigger a click event on the anchor to start the download
      document.body.appendChild(a);
      a.click();

      // Clean up by removing the anchor and revoking the URL
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Logs have been exported to JSON file.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return (
          <Badge className="bg-red-500 text-white hover:bg-red-600 w-24 justify-center font-medium">
            ERROR
          </Badge>
        );
      case 'warn':
      case 'warning':
        return (
          <Badge className="bg-amber-500 text-white hover:bg-amber-600 w-24 justify-center font-medium">
            WARN
          </Badge>
        );
      case 'info':
        return (
          <Badge className="bg-blue-500 text-white hover:bg-blue-600 w-24 justify-center font-medium">
            INFO
          </Badge>
        );
      case 'critical':
        return (
          <Badge className="bg-purple-600 text-white hover:bg-purple-700 w-24 justify-center font-medium">
            CRITICAL
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 text-white hover:bg-gray-600 w-24 justify-center font-medium">
            {level.toUpperCase()}
          </Badge>
        );
    }
  };

  // Calculate pagination information
  const startItem = (filters.page - 1) * filters.limit + 1;
  const endItem = Math.min(filters.page * filters.limit, total);
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <MainLayout>
      <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              System Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and analyze system logs across all services
            </p>
          </div>
          <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={fetchLogs}
                    disabled={loading}
                    size="icon"
                    className="size-9 hover:shadow-md transition-all duration-200 hover:border-primary/40"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh logs</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleExportLogs}
                    disabled={loading || filteredLogs.length === 0}
                    size="icon"
                    className="size-9 hover:shadow-md transition-all duration-200 hover:border-primary/40"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export logs as JSON</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleClearLogs}
                    disabled={loading || filteredLogs.length === 0}
                    size="icon"
                    className="size-9 hover:shadow-md transition-all duration-200 hover:border-destructive/40"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Clear all logs</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="default"
              className="ml-2"
              onClick={() => setFiltersVisible(!filtersVisible)}
            >
              <Search className="h-4 w-4 mr-2" />
              {filtersVisible ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </div>

        {filtersVisible && (
          <Card className="shadow-sm border border-border/50 animate-in fade-in-50 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-1">
                <Search className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-2.5 text-muted-foreground">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder="Search logs..."
                      defaultValue={filters.search}
                      onChange={handleSearchChange}
                      className="pl-9 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch();
                        }
                      }}
                    />
                    {searching && (
                      <div className="absolute right-10 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {filters.search && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1.5 h-7 w-7 opacity-70 hover:opacity-100 transition-opacity"
                        onClick={clearSearch}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="default"
                    className="flex-shrink-0 hover:shadow-md transition-all duration-200"
                    onClick={handleSearch}
                    disabled={searching}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                <div>
                  <Select
                    value={filters.service}
                    onValueChange={handleServiceSelect}
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select service" />
                      </div>
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
                    onValueChange={handleLevelSelect}
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select level" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="info">
                        <div className="flex items-center">
                          <Info className="h-4 w-4 mr-2 text-blue-500" />
                          Info
                        </div>
                      </SelectItem>
                      <SelectItem value="warning">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                          Warning
                        </div>
                      </SelectItem>
                      <SelectItem value="error">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                          Error
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {filters.startDate ? format(new Date(filters.startDate), 'PPP') : 'Filter by date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.startDate ? new Date(filters.startDate) : undefined}
                        onSelect={(date) => handleDateSelect(date, 'start')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-border/50 animate-in fade-in-50 duration-300">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <div className="bg-muted/50 size-16 flex items-center justify-center rounded-full mb-4">
                    <Slash className="h-8 w-8 text-muted-foreground/70" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No logs found</h3>
                  <p className="text-muted-foreground">Try changing your filters or refresh to see new logs</p>
                  <Button variant="default" onClick={fetchLogs} className="mt-4">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Logs
                  </Button>
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <div className="max-h-[60vh] overflow-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-muted/70 backdrop-blur-sm text-sm">
                          <th className="py-3 px-4 text-left font-semibold resizable first:rounded-tl-lg">Timestamp</th>
                          <th className="py-3 px-4 text-left font-semibold w-24 resizable">Level</th>
                          <th className="py-3 px-4 text-left font-semibold resizable">Service</th>
                          <th className="py-3 px-4 text-left font-semibold resizable last:rounded-tr-lg">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {getPaginatedLogs().map((log: Log, index: number) => (
                          <tr
                            key={`${log.timestamp}-${index}`}
                            className="group hover:bg-muted/50 transition-colors duration-200 cursor-pointer border-l-2 border-transparent hover:border-l-primary/70"
                            onClick={() => {
                              setSelectedLog(log);
                              setIsDialogOpen(true);
                            }}
                          >
                            <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-muted-foreground">
                              <time dateTime={log.timestamp}>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</time>
                            </td>
                            <td className="py-3 px-4">
                              {getLevelBadge(log.level)}
                            </td>
                            <td className="py-3 px-4 text-sm truncate max-w-[200px]">
                              {log.service}
                            </td>
                            <td className="py-3 px-4 text-sm font-mono">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[400px]">{log.message}</span>
                                <CopyButton text={log.message} />
                                {log.metadata && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <FileJson className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Contains additional metadata
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  <div className="flex justify-between items-center p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-medium">{filteredLogs.length === 0 ? 0 : startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{total}</span> logs
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filters.page === 1 || loading}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="hover:shadow-md transition-all duration-200"
                      >
                        <ChevronLeftIcon className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filteredLogs.length < filters.limit || loading}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="hover:shadow-md transition-all duration-200"
                      >
                        Next
                        <ChevronRightIcon className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Log Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
          <DialogTitle className="sr-only">Log Details</DialogTitle>
          {selectedLog && (
            <>
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    {getLevelBadge(selectedLog.level)}
                    {selectedLog.log_type && (
                      <Badge variant="outline" className="capitalize">
                        {selectedLog.log_type}
                        {selectedLog.log_subtype && ` / ${selectedLog.log_subtype}`}
                      </Badge>
                    )}
                    {selectedLog.confidence_score !== undefined && (
                      <Badge variant="outline" className={cn(
                        selectedLog.confidence_score >= 0.8 ? "bg-green-500/10 text-green-600" :
                          selectedLog.confidence_score >= 0.6 ? "bg-yellow-500/10 text-yellow-600" :
                            "bg-red-500/10 text-red-600"
                      )}>
                        {Math.round(selectedLog.confidence_score * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {format(new Date(selectedLog.timestamp), 'MMM d, yyyy, h:mm:ss a')}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <CopyButton text={JSON.stringify(selectedLog, null, 2)} />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                            toast({ description: "Full log copied to clipboard" });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy full log data</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <h3 className="text-base font-semibold text-primary mb-2 flex items-center">Log Message</h3>
                  <div className="bg-muted/50 p-4 rounded-md border shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <p className="whitespace-pre-wrap break-words text-sm font-mono">
                        {selectedLog.message}
                      </p>
                      <CopyButton text={selectedLog.message} />
                    </div>
                  </div>
                </div>

                {selectedLog.error_code && (
                  <div>
                    <h3 className="text-base font-semibold text-primary mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1.5 text-destructive" />
                      Error Details
                    </h3>
                    <div className="bg-destructive/5 p-4 rounded-md border border-destructive/20 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="font-mono text-sm text-destructive">
                            Error Code: {selectedLog.error_code}
                          </div>
                          {selectedLog.correlation_id && (
                            <div className="font-mono text-sm text-muted-foreground">
                              Correlation ID: {selectedLog.correlation_id}
                            </div>
                          )}
                        </div>
                        <CopyButton text={selectedLog.error_code} />
                      </div>
                    </div>
                  </div>
                )}

                {selectedLog.tags && selectedLog.tags.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-primary mb-2 flex items-center">
                      <Server className="h-4 w-4 mr-1.5" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLog.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.entities && Object.keys(selectedLog.entities).length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-primary mb-2 flex items-center">
                      <FileJson className="h-4 w-4 mr-1.5" />
                      Entities
                    </h3>
                    <ScrollArea className="max-h-[20vh]">
                      <div className="bg-muted/50 p-4 rounded-md border shadow-sm">
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(selectedLog.entities).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                              <h4 className="text-sm font-medium text-muted-foreground capitalize">{key}</h4>
                              <div className="bg-background/50 p-2 rounded border">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-mono break-all">
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </span>
                                  <CopyButton text={typeof value === 'string' ? value : JSON.stringify(value)} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <h3 className="text-base font-semibold text-primary mb-2 flex items-center">
                      <FileJson className="h-4 w-4 mr-1.5" />
                      Metadata
                    </h3>
                    <ScrollArea className="max-h-[40vh]">
                      <div className="bg-muted/50 p-4 rounded-md border shadow-sm">
                        <div className="space-y-4">
                          {typeof selectedLog.metadata === 'object' && selectedLog.metadata !== null ? (
                            (() => {
                              const formatted = formatData(selectedLog.metadata);
                              if (Array.isArray(formatted)) {
                                return formatted.map((item: FormattedMetadata, index: number) => (
                                  <div key={`${item.key}-${index}`} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-muted-foreground">{item.key}</h4>
                                      <CopyButton text={typeof item.value === 'string' ? item.value : JSON.stringify(item.value)} />
                                    </div>
                                    <div className="bg-background/50 p-2 rounded border">
                                      {typeof item.value === 'string' ? (
                                        <p className="text-sm font-mono break-words whitespace-pre-wrap">{item.value}</p>
                                      ) : (
                                        <pre className="text-sm font-mono break-words whitespace-pre-wrap">
                                          {JSON.stringify(item.value, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  </div>
                                ));
                              }
                              // If not an array, it's a string
                              const formattedString = formatted as string;
                              return (
                                <div className="flex justify-between items-start">
                                  <pre className="whitespace-pre-wrap break-words text-sm font-mono">
                                    {formattedString}
                                  </pre>
                                  <CopyButton text={formattedString} />
                                </div>
                              );
                            })() as React.ReactNode
                          ) : (
                            <div className="flex justify-between items-start">
                              <pre className="whitespace-pre-wrap break-words text-sm font-mono">
                                {String(selectedLog.metadata)}
                              </pre>
                              <CopyButton text={String(selectedLog.metadata)} />
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {selectedLog.raw_payload && (
                  <div>
                    <h3 className="text-base font-semibold text-primary mb-2 flex items-center">
                      <FileJson className="h-4 w-4 mr-1.5" />
                      Raw Payload
                    </h3>
                    <div className="bg-muted/50 p-4 rounded-md border shadow-sm">
                      <div className="flex justify-between items-start gap-4">
                        <ScrollArea className="max-h-[40vh] w-full">
                          <pre className="whitespace-pre-wrap break-words text-sm font-mono custom-scrollbar">
                            {typeof selectedLog.raw_payload === 'string'
                              ? selectedLog.raw_payload
                              : JSON.stringify(selectedLog.raw_payload, null, 2)}
                          </pre>
                        </ScrollArea>
                        <div className="flex-shrink-0">
                          <CopyButton
                            text={typeof selectedLog.raw_payload === 'string'
                              ? selectedLog.raw_payload
                              : JSON.stringify(selectedLog.raw_payload, null, 2)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedLog.endpoint && (
                  <div>
                    <h3 className="text-base font-semibold text-primary mb-2 flex items-center">
                      <Slash className="h-4 w-4 mr-1.5" />
                      Endpoint
                    </h3>
                    <div className="bg-muted/50 p-4 rounded-md border shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-mono">
                          {selectedLog.endpoint}
                        </p>
                        <CopyButton text={selectedLog.endpoint} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h3 className="text-xs font-medium mb-1 text-muted-foreground">Service</h3>
                    <p className="text-sm">{selectedLog.service}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium mb-1 text-muted-foreground">Environment</h3>
                    <p className="text-sm">{selectedLog.environment || 'production'}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium mb-1 text-muted-foreground">Timestamp</h3>
                    <p className="text-sm font-mono">{format(new Date(selectedLog.timestamp), 'MMM d, yyyy, h:mm:ss a')}</p>
                  </div>
                  {selectedLog.correlation_id && (
                    <div>
                      <h3 className="text-xs font-medium mb-1 text-muted-foreground">Correlation ID</h3>
                      <p className="text-sm font-mono">{selectedLog.correlation_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
