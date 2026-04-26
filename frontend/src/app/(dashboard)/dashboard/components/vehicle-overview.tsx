"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@lib/currency";
import { Bike, Car, Package, TrendingUp, TrendingDown, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const fetchVehicleStats = async (): Promise<IVehicleDashboardStats | null> => {
    const res = await axios.get<ApiResponse<IVehicleDashboardStats>>("/vehicles/stats");
    return res.data.data ?? null;
};

const VehicleOverview = () => {
    const { data: stats, isLoading } = useQuery<IVehicleDashboardStats | null>({
        queryKey: ["vehicle-stats"],
        queryFn: fetchVehicleStats,
        retry: 0,
        staleTime: 1000 * 60 * 5, // 5 min
    });

    const combined = stats?.combined;
    const pending = stats?.pendingItems;
    const isProfit = (combined?.netProfit ?? 0) >= 0;

    const summaryCards = [
        {
            label: "In Stock",
            value: combined?.inStock ?? 0,
            sub: `${combined?.total ?? 0} total vehicles`,
            icon: Package,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
        },
        {
            label: "Total Invested",
            value: formatCurrency(combined?.totalInvested ?? 0),
            sub: `${combined?.total ?? 0} vehicles`,
            icon: Bike,
            color: "text-foreground",
            bg: "bg-muted/40",
        },
        {
            label: "Total Revenue",
            value: formatCurrency(combined?.totalRevenue ?? 0),
            sub: `${(combined?.sold ?? 0) + (combined?.soldPending ?? 0)} sold`,
            icon: Car,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Net Profit",
            value: formatCurrency(Math.abs(combined?.netProfit ?? 0)),
            sub: `${(combined?.avgMargin ?? 0).toFixed(1)}% margin (sold only)`,
            icon: isProfit ? TrendingUp : TrendingDown,
            color: isProfit ? "text-emerald-400" : "text-red-400",
            bg: isProfit ? "bg-emerald-500/10" : "bg-red-500/10",
        },
    ];

    const pendingAlerts = [
        { label: "Balance pending", count: pending?.balancePending.count ?? 0, amount: pending?.balancePending.totalAmount ?? 0, color: "text-red-400", dot: "bg-red-400" },
        { label: "NOC pending", count: pending?.nocPending.count ?? 0, amount: null, color: "text-orange-400", dot: "bg-orange-400" },
        { label: "Purchase payment due", count: pending?.purchasePaymentsDue.count ?? 0, amount: pending?.purchasePaymentsDue.totalAmount ?? 0, color: "text-yellow-400", dot: "bg-yellow-400" },
    ].filter((a) => a.count > 0);

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-md">
                        <Car className="h-4 w-4 text-white" />
                    </div>
                    <p className="font-bold text-foreground">Vehicle Overview</p>
                </div>
                <Link href="/vehicles">
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1">
                        View All <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </Link>
            </div>

            {/* Stat Cards */}
            {isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className={cn("rounded-lg p-3 border border-border", card.bg)}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
                                    <Icon className={cn("h-3.5 w-3.5", card.color)} />
                                </div>
                                <p className={cn("text-base font-bold truncate", card.color)}>{card.value}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 2W vs 4W quick split */}
            {!isLoading && stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { label: "Two Wheelers 🏍️", href: "/vehicles?type=two_wheeler", data: stats.twoWheelers },
                        { label: "Four Wheelers 🚗", href: "/vehicles?type=four_wheeler", data: stats.fourWheelers },
                    ].map(({ label, href, data }) => (
                        <Link key={label} href={href} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors">
                            <div>
                                <p className="text-xs font-semibold text-foreground">{label}</p>
                                <p className="text-[10px] text-muted-foreground">{data.inStock} in stock • {data.sold} sold</p>
                            </div>
                            <p className={cn("text-sm font-bold", data.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {data.netProfit >= 0 ? "+" : ""}{formatCurrency(data.netProfit)}
                            </p>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pending Alerts */}
            {pendingAlerts.length > 0 && (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">Needs Attention</p>
                    </div>
                    <div className="space-y-1">
                        {pendingAlerts.map((a) => (
                            <div key={a.label} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className={cn("h-1.5 w-1.5 rounded-full", a.dot)} />
                                    <span className={a.color}>{a.count} {a.label}</span>
                                </div>
                                {a.amount != null && a.amount > 0 && (
                                    <span className={cn("font-semibold", a.color)}>{formatCurrency(a.amount)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleOverview;
