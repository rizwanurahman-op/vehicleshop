import { LayoutDashboard, Users, ArrowDownLeft, ArrowUpRight, BarChart3, Car, DollarSign, TrendingUp, Store, UserCheck, PieChart, ArrowLeftRight, ShoppingCart } from "lucide-react";

export interface MenuItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    phase?: number;
    group?: string;
    badge?: string;
}

export const SIDEBAR_MENU: MenuItem[] = [
    // Overview
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Overview" },

    // Phase 1 - Investor Management
    { label: "Lenders", href: "/lenders", icon: Users, phase: 1, group: "Investors" },
    { label: "Investments", href: "/investments", icon: ArrowDownLeft, phase: 1, group: "Investors" },
    { label: "Repayments", href: "/repayments", icon: ArrowUpRight, phase: 1, group: "Investors" },
    { label: "Summary", href: "/summary", icon: BarChart3, phase: 1, group: "Investors" },

    // Phase 2 - Vehicle Management
    { label: "Vehicles", href: "/vehicles", icon: Car, phase: 2, group: "Vehicles" },
    { label: "Purchases", href: "/purchases", icon: ShoppingCart, phase: 2, group: "Vehicles" },
    { label: "Sales", href: "/sales", icon: DollarSign, phase: 2, group: "Vehicles" },
    { label: "Reports", href: "/vehicles/reports", icon: TrendingUp, phase: 2, group: "Vehicles" },

    // Exchanges — cross-module (spans Phase 2 & Phase 3)
    { label: "Exchanges", href: "/exchanges", icon: ArrowLeftRight, group: "Exchanges" },

    // Phase 3 - Park & Sell (Consignment)
    { label: "Inventory", href: "/consignments", icon: Store, phase: 3, group: "Park & Sell" },
    { label: "Owners", href: "/vehicle-owners", icon: UserCheck, phase: 3, group: "Park & Sell" },
    { label: "Reports", href: "/consignments/reports", icon: PieChart, phase: 3, group: "Park & Sell" },
];

