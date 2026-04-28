"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, Store, Menu, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileNav from "./mobile-nav";

const BOTTOM_NAV_ITEMS = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Vehicles", href: "/vehicles", icon: Car },
    { label: "Inventory", href: "/consignments", icon: Store },
    { label: "Sales", href: "/sales", icon: DollarSign },
];

const BottomNav = () => {
    const pathname = usePathname();

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/80 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
            {BOTTOM_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 text-xs font-medium transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                                isActive ? "bg-primary/10" : "bg-transparent"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                        </div>
                        <span className="truncate text-[10px]">{item.label}</span>
                    </Link>
                );
            })}

            {/* Menu item opens the full sidebar via Sheet */}
            <div className="flex-1 flex justify-center">
                <MobileNav 
                    customTrigger={
                        <button className="flex flex-col items-center justify-center gap-1 py-2 px-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full cursor-pointer">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full transition-all bg-transparent">
                                <Menu className="h-5 w-5" />
                            </div>
                            <span className="truncate text-[10px]">Menu</span>
                        </button>
                    } 
                />
            </div>
        </div>
    );
};

export default BottomNav;
