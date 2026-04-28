"use client";

import { cn } from "@/lib/utils";
import { useState, Suspense } from "react";
import { Car, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { useUiStore } from "@stores/ui";
import { LogoutDialog } from ".";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SidebarFallback = ({ collapsed: _collapsed }: { collapsed: boolean }) => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
    </div>
);

const Sidebar = () => {
    const collapsed = useUiStore(s => s.sidebarCollapsed);
    const [logoutOpen, setLogoutOpen] = useState(false);

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out relative",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-border px-4 transition-all overflow-hidden whitespace-nowrap">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-md">
                    <Car className="h-5 w-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold text-foreground">VehicleBook</p>
                        <p className="truncate text-[10px] text-muted-foreground">Shop Management</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <Suspense fallback={<SidebarFallback collapsed={collapsed} />}>
                <SidebarNav collapsed={collapsed} />
            </Suspense>

            {/* Logout Button */}
            <div className="border-t border-border p-3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setLogoutOpen(true)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors",
                                    collapsed && "justify-center px-2"
                                )}
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                {!collapsed && <span>Sign out</span>}
                            </button>
                        </TooltipTrigger>
                        {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
                    </Tooltip>
                </TooltipProvider>
            </div>
            <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />

            {/* Collapse Toggle */}
            <button
                onClick={() => useUiStore.getState().toggleSidebar()}
                className="absolute -right-3 top-8 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground transition-colors z-50"
            >
                {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
        </aside>
    );
};

export default Sidebar;
