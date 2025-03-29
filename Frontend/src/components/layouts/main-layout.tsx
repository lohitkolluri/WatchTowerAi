import { ReactNode } from "react";
import Link from "next/link";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Search } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const sidebarNavItems = [
    {
      title: "Dashboard",
      href: "/",
    },
    {
      title: "Logs",
      href: "/logs",
    },
    {
      title: "Alerts",
      href: "/alerts",
    },
    {
      title: "Endpoints",
      href: "/endpoints",
    },
    {
      title: "Services",
      href: "/services",
    },
    {
      title: "Analytics",
      href: "/analytics",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">WatchTowerAI</span>
          </Link>
          <div className="ml-auto flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search..."
                className="rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-64 border-r bg-background">
          <div className="flex flex-col h-full py-4">
            <SidebarNav items={sidebarNavItems} className="px-4" />
          </div>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
