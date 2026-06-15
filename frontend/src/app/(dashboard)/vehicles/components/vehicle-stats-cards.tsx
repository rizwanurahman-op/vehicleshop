"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { cn } from "@/lib/utils";
import { formatINR, formatINRCompact } from "@lib/currency";
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

/**
 * Adaptive font size for the card value.
 * Card is small (4-col grid on lg, 2-col on mobile) so sizing is tight.
 */
const cardSizeClass = (val: string): string => {
    const len = val.length;
    if (len <= 2)  return "text-2xl";   // 0, 12
    if (len <= 5)  return "text-xl";    // ₹999, +₹0
    if (len <= 9)  return "text-lg";    // ₹53,000
    if (len <= 12) return "text-base";  // ₹1,23,45,678
    if (len <= 15) return "text-sm";    // crore scale
    return "text-xs";
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

    // Build a compact hint for large currency strings in the subtitle
    const fmtSub = (n: number) => {
        const full    = formatINR(n);
        const compact = formatINRCompact(n);
        return compact !== full ? `${full} (${compact})` : full;
    };

    const cards = [
        {
            label: "Total Inventory",
            value: String(c?.total ?? 0),
            sub: `🏍️ ${tw?.total ?? 0} two · 🚗 ${fw?.total ?? 0} four`,
            icon: Package,
            color: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/20",
        },
        {
            label: "In Stock",
            value: String(c?.inStock ?? 0),
            sub: `${c?.soldPending ?? 0} pending · ${c?.exchanged ?? 0} exchanged`,
            icon: Bike,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20",
        },
        {
            label: "Sold",
            value: String(c?.sold ?? 0),
            sub: `Revenue: ${fmtSub(c?.totalRevenue ?? 0)}`,
            icon: Car,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10 border-indigo-500/20",
        },
        {
            label: isProfit ? "Net Profit" : "Net Loss",
            value: formatINR(Math.abs(c?.netProfit ?? 0)),
            sub: `${(c?.avgMargin ?? 0).toFixed(1)}% margin · Invested: ${fmtSub(c?.totalInvested ?? 0)}`,
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
                const sizeClass = cardSizeClass(card.value);
                return (
                    <div
                        key={card.label}
                        className={cn("rounded-xl border p-4 transition-all hover:shadow-md", card.bg)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {card.label}
                            </p>
                            <Icon className={cn("h-3.5 w-3.5 shrink-0", card.color)} />
                        </div>
                        {/* Value: whitespace-nowrap prevents mid-digit breaks; title is fallback tooltip */}
                        <p
                            title={card.value}
                            className={cn(
                                "font-mono font-bold tabular-nums whitespace-nowrap overflow-hidden leading-tight",
                                sizeClass, card.color,
                            )}
                        >
                            {card.value}
                        </p>
                        {/* Subtitle: allow wrapping so context isn't cut off */}
                        <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{card.sub}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default VehicleStatsCards;
