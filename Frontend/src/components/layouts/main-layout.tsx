"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import {
  Search,
  Menu,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Globe,
  Activity,
  BarChart2,
  CheckCircle2,
  X,
  LogOut,
  User,
  Settings,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import authService from "@/services/authService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ title: string, href: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userInitials, setUserInitials] = useState("U");
  const router = useRouter();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);

    // Get user initials for avatar
    const getUserInitials = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user && user.name) {
          const initials = user.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase();
          setUserInitials(initials);
        }
      } catch (error) {
        console.error("Error getting user data:", error);
      }
    };

    getUserInitials();
  }, []);

  const sidebarNavItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      title: "Logs",
      href: "/logs",
      icon: <FileText className="h-5 w-5" />
    },
    {
      title: "Alerts",
      href: "/alerts",
      icon: <AlertTriangle className="h-5 w-5" />
    },
    {
      title: "Endpoints",
      href: "/endpoints",
      icon: <Globe className="h-5 w-5" />
    },
    {
      title: "Services",
      href: "/services",
      icon: <Activity className="h-5 w-5" />
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: <BarChart2 className="h-5 w-5" />
    },
  ];

  // Handle search functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Filter navigation items based on search query
    const results = sidebarNavItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(results);
  };

  // Navigate to selected item
  const navigateTo = (href: string) => {
    router.push(href);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background/95">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mr-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center">
            <div className="flex shrink-0 items-center">
              <Image
                src="/image.png"
                alt="WatchTowerAI"
                width={160}
                height={40}
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <div className="ml-auto flex items-center space-x-1 sm:space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={handleSearch}
                className="rounded-md border border-input bg-background/60 pl-8 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-[200px] lg:w-[300px]"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-2.5"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setIsSearching(false);
                  }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {/* Search Results Dropdown */}
              {isSearching && searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-background border rounded-md shadow-lg z-50">
                  <ul className="py-1">
                    {searchResults.map((result, index) => (
                      <li key={index}>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                          onClick={() => navigateTo(result.href)}
                        >
                          {/* Clone the icon from sidebarNavItems */}
                          {sidebarNavItems.find(item => item.href === result.href)?.icon}
                          <span>{result.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isSearching && searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-background border rounded-md shadow-lg z-50">
                  <p className="px-4 py-2 text-sm text-muted-foreground">No results found</p>
                </div>
              )}
            </div>

            {/* Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => authService.logout()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden pt-16">
        <aside
          className={cn(
            "fixed top-16 bottom-0 left-0 z-40 w-64 border-r bg-card/30 transition-all duration-200 ease-in-out overflow-y-auto",
            sidebarCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-[70px]" : "translate-x-0"
          )}
        >
          <div className="flex flex-col h-full">
            <SidebarNav items={sidebarNavItems} className="px-2 py-2" collapsed={sidebarCollapsed} />

            <div className="mt-auto border-t pt-2 pb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mx-3 rounded-md bg-accent/10 hover:bg-accent/20 transition-colors p-2 flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="text-xs ml-2 text-muted-foreground">All systems operational</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>All systems are operational</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </aside>

        <main className={cn(
          "flex-1 overflow-y-auto transition-all duration-200 ease-in-out min-h-[calc(100vh-4rem)]",
          sidebarCollapsed ? "lg:pl-[70px]" : "lg:pl-64",
          "px-6 py-8 md:px-8 md:py-10 lg:pr-10"
        )}>
          <div className="max-w-[1600px] mx-auto">
            {mounted && children}
          </div>
        </main>
      </div>
    </div>
  );
}
