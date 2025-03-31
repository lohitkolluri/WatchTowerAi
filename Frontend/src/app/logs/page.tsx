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
import { Log, logsService } from '@/services/logsService';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '@/components/layouts/main-layout';
import { Calendar as CalendarType } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import debounce from 'lodash/debounce';

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

export default function LogsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    service: '',
    level: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  // Debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update the input value immediately for visual feedback
    // but debounce the actual filter update
    const searchTerm = e.target.value;
    debouncedSearch(searchTerm);
  };

  const clearSearch = () => {
    // Clear the input visually and update the state
    const searchInput = document.querySelector('input[placeholder="Search logs..."]') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    setFilters(prev => ({ ...prev, search: '', page: 1 }));
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      console.log('Fetching logs with filters:', filters);
      const response = await logsService.getLogs(filters);

      // Make sure we have valid arrays and values
      const logsList = response?.logs || [];
      const totalCount = response?.total || 0;

      setLogs(logsList);
      setTotal(totalCount);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch logs. Please try again.',
        variant: 'destructive',
      });
      // Set safe defaults
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    await fetchLogs();
  };

  const fetchServices = async () => {
    try {
      const servicesList = await logsService.getServicesList();
      setServices(Array.isArray(servicesList) ? servicesList : []);
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

  const handleExportLogs = () => {
    try {
      // Generate a JSON string containing the logs
      const jsonData = JSON.stringify(logs, null, 2);

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

  useEffect(() => {
    fetchLogs();
  }, [filters]);

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

  const formatData = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
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
                    disabled={loading || logs.length === 0}
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
                    disabled={loading || logs.length === 0}
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
              <CardDescription>
                Filter logs by service, level, date, or search text
              </CardDescription>
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
                    onValueChange={(value) => setFilters(prev => ({ ...prev, service: value === 'all' ? '' : value, page: 1 }))}
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
                    onValueChange={(value) => setFilters(prev => ({ ...prev, level: value === 'all' ? '' : value, page: 1 }))}
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
                        onSelect={(date) => setFilters(prev => ({
                          ...prev,
                          startDate: date ? date.toISOString() : '',
                          page: 1
                        }))}
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
            <div className="flex flex-col justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary/60" />
              <p className="text-muted-foreground">Loading logs...</p>
            </div>
          ) : (
            <>
              {logs.length === 0 ? (
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
                    <table className="w-full border-collapse resizable-table">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-muted/70 backdrop-blur-sm border-b text-sm">
                          <th className="py-3 px-4 text-left font-semibold resizable">Timestamp</th>
                          <th className="py-3 px-4 text-left font-semibold w-24 resizable">Level</th>
                          <th className="py-3 px-4 text-left font-semibold resizable">Service</th>
                          <th className="py-3 px-4 text-left font-semibold resizable">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {logs.map((log, index) => (
                          <tr
                            key={`${log.timestamp}-${index}`}
                            className="group hover:bg-muted/50 transition-colors duration-200 cursor-pointer border-l-4 border-transparent hover:border-l-primary/70 hover:shadow-sm"
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
                      Showing <span className="font-medium">{logs.length === 0 ? 0 : startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{total}</span> logs
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
                        disabled={logs.length < filters.limit || loading}
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
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
          <DialogTitle className="sr-only">Log Details</DialogTitle>
          {selectedLog && (
            <>
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center">
                    {getLevelBadge(selectedLog.level)}
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

                <div>
                  <h3 className="text-base font-semibold text-primary mb-2 flex items-center">
                    <FileJson className="h-4 w-4 mr-1.5" />
                    Metadata
                  </h3>
                  <ScrollArea className="max-h-[40vh] overflow-auto">
                    <div className="bg-muted/50 p-4 rounded-md border shadow-sm hover:shadow-md transition-all">
                      {selectedLog.metadata ? (
                        <div className="flex justify-between items-start">
                          <pre className="whitespace-pre-wrap break-words text-sm font-mono">
                            {formatData(selectedLog.metadata)}
                          </pre>
                          <CopyButton text={formatData(selectedLog.metadata)} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No metadata available</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

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
                    <h3 className="text-xs font-medium mb-1 text-muted-foreground">Timestamp</h3>
                    <p className="text-sm font-mono">{format(new Date(selectedLog.timestamp), 'MMM d, yyyy, h:mm:ss a')}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
