import MainLayout from "@/components/layouts/main-layout";
import { Calendar, Download, Filter } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reporting</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Last 7 days</span>
          </div>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Logs</h3>
            <p className="text-3xl font-bold">124,892</p>
            <p className="text-xs text-muted-foreground">Updated 1 hour ago</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
