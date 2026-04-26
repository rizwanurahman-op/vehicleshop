"use client";

import { cn } from "@/lib/utils";
import { useState, Suspense } from "react";
import { Car, ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

const SidebarFallback = ({ collapsed: _collapsed }: { collapsed: boolean }) => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
    </div>
);

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
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

            {/* Collapse Toggle */}
            <div className="border-t border-border p-3">
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                        collapsed && "justify-center"
                    )}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    {!collapsed && <span>Collapse</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
