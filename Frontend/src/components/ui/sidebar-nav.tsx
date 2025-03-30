"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
    icon?: React.ReactNode;
  }[];
  collapsed?: boolean;
}

export function SidebarNav({ className, items, collapsed = false, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className={cn("py-2", collapsed ? "px-2" : "px-3")}>
      {!collapsed && (
        <div className="mb-4 px-2">
          <h2 className="text-xs font-semibold tracking-tight text-muted-foreground/80 uppercase">
            Navigation
          </h2>
        </div>
      )}
      <nav
        className={cn(
          "flex flex-col space-y-1",
          className
        )}
        {...props}
      >
        {items.map((item) => {
          const isActive = pathname === item.href;
          const icon = item.icon;

          return collapsed ? (
            <TooltipProvider key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex h-9 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {icon && (
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                      )}>
                        {icon}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex h-9 items-center justify-between rounded-md px-3 text-sm font-medium transition-all duration-200 ease-in-out",
                "hover:bg-accent/50 hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:translate-x-1"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="flex items-center gap-3">
                {icon && (
                  <span className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                  )}>
                    {icon}
                  </span>
                )}
                <span className={cn(
                  isActive ? "font-medium" : "font-normal"
                )}>
                  {item.title}
                </span>
              </div>

              {isActive && (
                <ChevronRight className="h-4 w-4 opacity-70" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
