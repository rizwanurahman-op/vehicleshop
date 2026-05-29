"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SIDEBAR_MENU } from "@data/menu";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@stores/session";

interface SidebarNavProps {
    collapsed?: boolean;
    onItemClick?: () => void;
}

export function SidebarNav({ collapsed = false, onItemClick }: SidebarNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const role = useSessionStore(s => s.user?.role);

    // Filter out adminOnly items for non-admin users
    const visibleMenu = SIDEBAR_MENU.filter(item => !item.adminOnly || role === "admin");

    // Group menu items
    const groups = visibleMenu.reduce<Record<string, typeof visibleMenu>>((acc, item) => {
        const group = item.group || "Other";
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});

    return (
        <nav className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1">
            <TooltipProvider>
                {Object.entries(groups).map(([group, items]) => (
                    <div key={group} className="mb-2">
                        {!collapsed && (
                            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {group}
                            </p>
                        )}
                        {items.map(item => {
                            const Icon = item.icon;
                            const hrefPath = item.href.split("?")[0];
                            const itemQuery = new URLSearchParams(item.href.split("?")[1] || "");

                            let isActive = false;
                            if (item.href === "/dashboard") {
                                isActive = pathname === "/dashboard";
                            } else {
                                const isPathMatch = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
                                if (isPathMatch) {
                                    const isBetterMatchExists = visibleMenu.some(otherItem => {
                                        const otherHrefPath = otherItem.href.split("?")[0];
                                        return (
                                            otherItem.href !== item.href &&
                                            (pathname === otherHrefPath || pathname.startsWith(`${otherHrefPath}/`)) &&
                                            otherHrefPath.length > hrefPath.length
                                        );
                                    });

                                    if (!isBetterMatchExists) {
                                        if (item.href.includes("?")) {
                                            const hasAllParams = Array.from(itemQuery.entries()).every(
                                                ([key, value]) => searchParams.get(key) === value
                                            );
                                            isActive = hasAllParams;
                                        } else {
                                            isActive = true;
                                        }
                                    }
                                }
                            }

                            const link = (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onItemClick}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                        collapsed && "justify-center px-2"
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            );

                            if (collapsed) {
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                                        <TooltipContent side="right">{item.label}</TooltipContent>
                                    </Tooltip>
                                );
                            }
                            return link;
                        })}
                    </div>
                ))}
            </TooltipProvider>
        </nav>
    );
}
