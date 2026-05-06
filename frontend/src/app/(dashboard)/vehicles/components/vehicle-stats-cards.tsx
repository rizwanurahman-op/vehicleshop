"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@lib/currency";
import { Package, Bike, Car, TrendingUp, TrendingDown } from "lucide-react";

export type VehicleStatsFilters = {
    vehicleType?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    isFromExchange?: string;
    search?: string;
};

const fetchVehicleStats = async (filters: VehicleStatsFilters): Promise<IVehicleDashboardStats | null> => {
    const params: Record<string, string> = {};
    if (filters.vehicleType) params.vehicleType = filters.vehicleType;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.status) params.status = filters.status;
    if (filters.isFromExchange) params.isFromExchange = filters.isFromExchange;
    if (filters.search) params.search = filters.search;
    const res = await axios.get<ApiResponse<IVehicleDashboardStats>>("/vehicles/stats", { params });
    return res.data.data ?? null;
};

type Props = { filters?: VehicleStatsFilters };

const VehicleStatsCards = ({ filters = {} }: Props) => {
    const isFiltered = Object.keys(filters).some((k) => !!filters[k as keyof VehicleStatsFilters]);

    const { data: stats, isLoading } = useQuery<IVehicleDashboardStats | null>({
        // When no filters applied → shared cache key with dashboard ("vehicle-stats")
        // When filtered → unique key so both live independently
        queryKey: isFiltered ? ["vehicle-stats", filters] : ["vehicle-stats"],
        queryFn: () => fetchVehicleStats(filters),
        staleTime: 1000 * 60 * 5,
        retry: 0,
    });

    const c = stats?.combined;
    const tw = stats?.twoWheelers;
    const fw = stats?.fourWheelers;
    const isProfit = (c?.netProfit ?? 0) >= 0;

    const cards = [
        {
            label: "Total Inventory",
            value: c?.total ?? 0,
            sub: `🏍️ ${tw?.total ?? 0} two · 🚗 ${fw?.total ?? 0} four`,
            icon: Package,
            color: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/20",
        },
        {
            label: "In Stock",
            value: c?.inStock ?? 0,
            sub: `${c?.soldPending ?? 0} pending · ${c?.exchanged ?? 0} exchanged`,
            icon: Bike,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20",
        },
        {
            label: "Sold",
            value: c?.sold ?? 0,
            sub: `Revenue: ${formatCurrency(c?.totalRevenue ?? 0)}`,
            icon: Car,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10 border-indigo-500/20",
        },
        {
            label: isProfit ? "Net Profit" : "Net Loss",
            value: formatCurrency(Math.abs(c?.netProfit ?? 0)),
            sub: `${(c?.avgMargin ?? 0).toFixed(1)}% margin · Invested: ${formatCurrency(c?.totalInvested ?? 0)}`,
            icon: isProfit ? TrendingUp : TrendingDown,
            color: isProfit ? "text-emerald-400" : "text-red-400",
            bg: isProfit ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20",
        },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40 border border-border" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isFiltered && (
                <div className="col-span-2 lg:col-span-4 flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-border/50 rounded-lg px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                    Stats reflect current filters
                </div>
            )}
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.label}
                        className={cn("rounded-xl border p-4 transition-all hover:shadow-md", card.bg)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {card.label}
                            </p>
                            <Icon className={cn("h-3.5 w-3.5", card.color)} />
                        </div>
                        <p className={cn("text-xl font-bold tabular-nums truncate", card.color)}>{card.value}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground truncate">{card.sub}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default VehicleStatsCards;
