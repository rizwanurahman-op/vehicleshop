"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ReceiptText, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
    Eye, AlertTriangle, Search, ArrowLeftRight, Car, Building2,
    IndianRupee, CheckCircle2, Clock, Filter, User
} from "lucide-react";
import VehicleTypeIcon from "../../vehicles/components/vehicle-type-icon";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

type SalesListProps = { initialData: SalesPaginatedData | null };

const fetchSales = async (params: Record<string, string | number>): Promise<SalesPaginatedData | null> => {
    const res = await axios.get<ApiResponse<SalesPaginatedData>>("/sales", { params });
    return res.data.data ?? null;
};

const SourceBadge = ({ source, saleType }: { source: "vehicle" | "consignment"; saleType?: string }) => {
    if (source === "vehicle") {
        return (
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] gap-1">
                <Car className="h-2.5 w-2.5" />Purchase
            </Badge>
        );
    }
    const isPark = saleType === "park_sale";
    return (
        <Badge className={cn("text-[10px] gap-1", isPark
            ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20")}>
            <Building2 className="h-2.5 w-2.5" />
            {isPark ? "Park" : "Finance"}
        </Badge>
    );
};

const SaleStatusBadge = ({ status }: { status: string }) => {
    if (status === "fully_received" || status === "fully_closed") {
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Fully Received</Badge>;
    }
    if (status === "balance_pending") {
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Balance Pending</Badge>;
    }
    if (status === "noc_pending") {
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />NOC Pending</Badge>;
    }
    return <Badge className="bg-muted/50 text-muted-foreground text-[10px]">{status.replace(/_/g, " ")}</Badge>;
};

const StatCard = ({ label, value, sub, color = "text-foreground", bg = "bg-card border-border", icon: Icon }: {
    label: string; value: string; sub?: string; color?: string; bg?: string; icon: React.ElementType;
}) => (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", bg)}>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", bg.includes("emerald") ? "bg-emerald-500/15" : bg.includes("red") ? "bg-red-500/15" : bg.includes("orange") ? "bg-orange-500/15" : bg.includes("blue") ? "bg-blue-500/15" : bg.includes("violet") ? "bg-violet-500/20" : "bg-primary/10")}>
            <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">{label}</p>
            <p className={cn("text-lg font-bold leading-tight", color)}>{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    </div>
);

const SalesList = ({ initialData }: SalesListProps) => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sourceFilter, setSourceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [exchangeFilter, setExchangeFilter] = useState("all");

    const debouncedSearch = useDebounce(search, 300);

    const params: Record<string, string | number> = { page, limit: 20 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (sourceFilter !== "all") params.source = sourceFilter;
    if (statusFilter !== "all") params.saleStatus = statusFilter;
    if (exchangeFilter === "exchange") params.isExchange = "true";

    const { data, isLoading } = useQuery<SalesPaginatedData | null>({
        queryKey: ["sales", { page, debouncedSearch, sourceFilter, statusFilter, exchangeFilter }],
        queryFn: () => fetchSales(params),
        initialData: page === 1 && !debouncedSearch && sourceFilter === "all" && statusFilter === "all" ? initialData : undefined,
        retry: 0,
    });

    const records = data?.data ?? [];
    const stats = data?.stats;
    const meta = data ? { total: data.total, page: data.page, totalPages: data.totalPages } : null;

    const resetPage = () => setPage(1);

    return (
        <div className="flex w-full flex-col gap-5 pb-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                        <ReceiptText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Sales Register</h1>
                        <p className="text-sm text-muted-foreground">All vehicle & consignment sales — purchased and park/finance sales</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} sub={`${stats.totalSales} sales`} icon={IndianRupee} bg="bg-card border-border" />
                    <StatCard label="Total Received" value={formatCurrency(stats.totalReceived)} color="text-emerald-400" bg="bg-emerald-500/5 border-emerald-500/20" icon={CheckCircle2} />
                    <StatCard label="Outstanding" value={formatCurrency(stats.totalBalance)} sub={`${stats.pendingCount} pending`} color="text-red-400" bg="bg-red-500/5 border-red-500/20" icon={Clock} />
                    <StatCard label="Total Profit" value={formatCurrency(stats.totalProfit)} color={stats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"} bg={stats.totalProfit >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"} icon={stats.totalProfit >= 0 ? TrendingUp : TrendingDown} />
                </div>
            )}

            {/* Secondary stats strip */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm"><Car className="h-4 w-4 text-blue-400" /><span className="text-muted-foreground">Purchase Sales</span></div>
                        <span className="font-bold text-foreground">{stats.vehicleSales}</span>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-violet-400" /><span className="text-muted-foreground">Park/Finance Sales</span></div>
                        <span className="font-bold text-foreground">{stats.consignmentSales}</span>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm"><ArrowLeftRight className="h-4 w-4 text-orange-400" /><span className="text-muted-foreground">Exchange Sales</span></div>
                        <span className="font-bold text-orange-400">{stats.exchangeCount}</span>
                    </div>
                </div>
            )}

            {/* Pending alert */}
            {stats && stats.pendingCount > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400" />
                    <p className="text-sm text-orange-300">
                        <strong>{stats.pendingCount}</strong> sale{stats.pendingCount !== 1 ? "s" : ""} with outstanding balance.
                        Outstanding amount: <strong className="text-orange-400">{formatCurrency(stats.totalBalance)}</strong>
                    </p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 h-10 bg-muted/50 border-border"
                        placeholder="Search vehicle, buyer, reg.no..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                    />
                </div>
                <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); resetPage(); }}>
                    <SelectTrigger className="h-10 w-44 bg-muted/50 border-border">
                        <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="vehicle">🚘 Purchase Vehicles</SelectItem>
                        <SelectItem value="consignment">🏪 Consignments</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage(); }}>
                    <SelectTrigger className="h-10 w-44 bg-muted/50 border-border">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="fully_received">✅ Fully Received</SelectItem>
                        <SelectItem value="balance_pending">⏳ Balance Pending</SelectItem>
                        <SelectItem value="noc_pending">📄 NOC Pending</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={exchangeFilter} onValueChange={(v) => { setExchangeFilter(v); resetPage(); }}>
                    <SelectTrigger className="h-10 w-40 bg-muted/50 border-border">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="exchange">🔄 Exchange Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Data View */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Mobile Cards View (< md) */}
                <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/40 border border-border/50" />
                        ))
                    ) : records.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            <ReceiptText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                            No sales found
                        </div>
                    ) : (
                        records.map((r) => {
                            const isProfit = r.profitLoss >= 0;
                            const href = `/${r.source === "vehicle" ? "vehicles" : "consignments"}/${r._id}`;
                            const paidPct = r.soldPrice > 0 ? (r.receivedAmount / r.soldPrice) * 100 : 100;

                            return (
                                <Link key={r._id} href={href} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden">
                                    {/* Decorative glow */}
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                    {/* Status top bar */}
                                    {r.balanceAmount > 0 ? (
                                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-orange-400 to-red-500" />
                                    ) : (
                                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                                    )}

                                    {/* Header */}
                                    <div className="relative flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            <span className="flex items-center justify-center h-6 w-6 rounded bg-muted/80">
                                                <VehicleTypeIcon type={r.vehicleType} className="h-3.5 w-3.5" />
                                            </span>
                                            {r.dateSold ? formatDate(r.dateSold) : "—"}
                                        </div>
                                        <SaleStatusBadge status={r.saleStatus} />
                                    </div>

                                    {/* Vehicle & Buyer */}
                                    <div className="relative mb-5 flex flex-col items-start">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <p className="text-lg font-bold text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">{r.make} {r.model}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className="text-[11px] font-medium text-muted-foreground">REG: <span className="text-foreground">{r.registrationNo}</span></span>
                                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">{r.refId}</span>
                                            <SourceBadge source={r.source} saleType={r.saleType} />
                                            {r.isExchange && (
                                                <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[9px] gap-0.5 px-1.5 py-0">
                                                    <ArrowLeftRight className="h-2 w-2" />Exchange
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 border border-border/50">
                                            <div className="h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <span className="text-xs font-medium text-foreground truncate max-w-[110px] sm:max-w-[180px]">{r.soldTo}</span>
                                            {r.soldToPhone && <span className="text-[10px] text-muted-foreground ml-1 shrink-0">· {r.soldToPhone}</span>}
                                        </div>
                                    </div>

                                    {/* Financial Section */}
                                    <div className="relative mt-auto pt-4 border-t border-border/60 border-dashed">
                                        <div className="flex items-end justify-between mb-4">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Sold Price</p>
                                                <p className="text-xl font-bold text-foreground tabular-nums leading-none tracking-tight">{formatCurrency(r.soldPrice)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Profit/Loss</p>
                                                <span className={cn("inline-flex items-center justify-end gap-1 font-bold text-base tabular-nums leading-none", isProfit ? "text-emerald-500" : "text-red-500")}>
                                                    {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                    {isProfit ? "+" : ""}{formatCurrency(r.profitLoss)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar & Balances */}
                                        <div>
                                            <div className="flex justify-between text-[11px] font-bold mb-1.5">
                                                <span className="text-emerald-500">Recv: {formatCurrency(r.receivedAmount)}</span>
                                                <span className={r.balanceAmount > 0 ? "text-red-500" : "text-emerald-500"}>Bal: {formatCurrency(r.balanceAmount)}</span>
                                            </div>
                                            <div className="relative h-1.5 w-full rounded-full bg-muted/80 overflow-hidden">
                                                <div 
                                                    className={cn("absolute top-0 left-0 h-full transition-all duration-700 ease-out", 
                                                        paidPct >= 100 ? "bg-emerald-500" : paidPct > 0 ? "bg-gradient-to-r from-orange-400 to-emerald-400" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${Math.min(paidPct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Vehicle</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Buyer</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Sold At</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Received</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Balance</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">P&L</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 10 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted/60" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                                        <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No sales found
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => {
                                    const isProfit = r.profitLoss >= 0;
                                    const href = `/${r.source === "vehicle" ? "vehicles" : "consignments"}/${r._id}`;
                                    return (
                                        <tr key={r._id} className="hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => window.location.href = href}>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <VehicleTypeIcon type={r.vehicleType} className="text-muted-foreground" />
                                                    <SourceBadge source={r.source} saleType={r.saleType} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {r.dateSold ? formatDate(r.dateSold) : "—"}
                                                {r.daysToSell != null && (
                                                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{r.daysToSell}d to sell</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 min-w-[160px]">
                                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                    <p className="font-semibold text-foreground">{r.make} {r.model}</p>
                                                    {r.isExchange && (
                                                        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] gap-0.5">
                                                            <ArrowLeftRight className="h-2.5 w-2.5" />Exchange
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[11px] text-muted-foreground font-mono">{r.registrationNo}</p>
                                                    <span className="text-[10px] text-muted-foreground/50">{r.refId}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-foreground">{r.soldTo}</p>
                                                {r.soldToPhone && <p className="text-[11px] text-muted-foreground">{r.soldToPhone}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                                                {formatCurrency(r.soldPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-400 font-semibold whitespace-nowrap">
                                                {formatCurrency(r.receivedAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className={cn("font-semibold", r.balanceAmount > 0 ? "text-red-400" : "text-emerald-400")}>
                                                    {formatCurrency(r.balanceAmount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className={cn("flex items-center justify-end gap-1 text-xs font-semibold", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                    {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                    {isProfit ? "+" : ""}{formatCurrency(r.profitLoss)}
                                                </span>
                                                <p className="text-[10px] text-muted-foreground text-right">{r.profitLossPercentage.toFixed(1)}%</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <SaleStatusBadge status={r.saleStatus} />
                                            </td>
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <Link href={href}>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Page {meta.page} of {meta.totalPages} &nbsp;·&nbsp; {meta.total} total records
                        </p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 border-border">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 border-border">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesList;
