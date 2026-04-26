"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    ArrowLeftRight, Car, ExternalLink, CheckCircle2,
    Clock, IndianRupee, AlertCircle, Filter, RefreshCw, Store
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────
interface ExchangeDeal {
    sourceId: string;
    sourceCollection: "vehicles" | "consignmentVehicles";
    sourceRefId: string;
    sourceMake: string;
    sourceModel: string;
    sourceRegNo: string;
    sourceSoldTo: string;
    sourceSoldDate: string | null;
    sourceSoldPrice: number;

    exchangePaymentId: string;
    exchangeDate: string;
    exchangeAmount: number;
    exchangeMake: string;
    exchangeRegNo: string;
    exchangeDetails?: string;

    exchangeCreatedRef: string | null;
    exchangeCreatedIn: "vehicles" | "consignmentVehicles" | null;
    exchangeCreatedRefId: string | null;
    exchangeCreatedMake?: string;
    exchangeCreatedRegNo?: string;

    sourceTotalCashReceived: number;
    sourceTotalReceived: number;
    sourceRemainingBalance: number;
    isFullySettled: boolean;
}

interface ExchangeStats {
    totalExchanges: number;
    totalExchangeValue: number;
    totalRemainingBalance: number;
    exchangesFromVehicles: number;
    exchangesFromConsignments: number;
    fullySettled: number;
    pendingSettlement: number;
}

interface ExchangePaginatedData {
    data: ExchangeDeal[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ── Stat Card ─────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, color }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}) => (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner", color)}>
            <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ── Source Vehicle Cell ───────────────────────────────────────────
const SourceCell = ({ deal }: { deal: ExchangeDeal }) => {
    const isConsignment = deal.sourceCollection === "consignmentVehicles";
    const href = `/${isConsignment ? "consignments" : "vehicles"}/${deal.sourceId}`;
    const Icon = isConsignment ? Store : Car;
    return (
        <div className="flex items-start gap-3 min-w-0">
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                isConsignment ? "bg-violet-500/10" : "bg-primary/10")}>
                <Icon className={cn("h-4 w-4", isConsignment ? "text-violet-400" : "text-primary")} />
            </div>
            <div className="min-w-0">
                <Link href={href} className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 group">
                    {deal.sourceMake} {deal.sourceModel}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
                <p className="text-xs font-mono text-muted-foreground">{deal.sourceRegNo}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                    Sold to <strong className="text-foreground">{deal.sourceSoldTo}</strong>
                    {deal.sourceSoldDate && <> on {formatDate(deal.sourceSoldDate)}</>}
                </p>
                <div className="mt-1">
                    <Badge className={cn("text-[10px]", isConsignment ? "bg-violet-500/10 text-violet-400" : "bg-primary/10 text-primary")}>
                        {isConsignment ? "Consignment" : "Vehicle"} · {deal.sourceRefId}
                    </Badge>
                </div>
            </div>
        </div>
    );
};

// ── Exchange Vehicle Cell ─────────────────────────────────────────
const ExchangeCell = ({ deal }: { deal: ExchangeDeal }) => {
    const hasInventory = !!deal.exchangeCreatedRef && !!deal.exchangeCreatedIn;
    const href = hasInventory
        ? `/${deal.exchangeCreatedIn === "vehicles" ? "vehicles" : "consignments"}/${deal.exchangeCreatedRef}`
        : null;

    return (
        <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                <ArrowLeftRight className="h-4 w-4 text-orange-400" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{deal.exchangeMake}</p>
                <p className="text-xs font-mono text-muted-foreground">{deal.exchangeRegNo}</p>
                {deal.exchangeDetails && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{deal.exchangeDetails}</p>
                )}
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <Badge className="bg-orange-500/10 text-orange-400 text-[10px]">
                        {formatCurrency(deal.exchangeAmount)}
                    </Badge>
                    {hasInventory && href ? (
                        <Link href={href} className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:underline">
                            <ExternalLink className="h-2.5 w-2.5" />
                            {deal.exchangeCreatedIn === "vehicles" ? "View Vehicle" : "View Consignment"}
                            {deal.exchangeCreatedRefId && <span className="font-mono">· {deal.exchangeCreatedRefId}</span>}
                        </Link>
                    ) : (
                        <span className="text-[10px] text-muted-foreground italic">Not added to inventory</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Settlement Cell ───────────────────────────────────────────────
const SettlementCell = ({ deal }: { deal: ExchangeDeal }) => {
    const pct = deal.sourceSoldPrice > 0
        ? Math.min(100, (deal.sourceTotalReceived / deal.sourceSoldPrice) * 100)
        : 0;

    return (
        <div className="min-w-[160px]">
            <div className="flex items-center gap-1.5 mb-2">
                {deal.isFullySettled ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" />Settled
                    </Badge>
                ) : (
                    <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] gap-1">
                        <Clock className="h-2.5 w-2.5" />Pending
                    </Badge>
                )}
            </div>
            <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                    <span>Sold</span>
                    <span className="font-semibold text-foreground">{formatCurrency(deal.sourceSoldPrice)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Exchange</span>
                    <span className="text-orange-400 font-medium">−{formatCurrency(deal.exchangeAmount)}</span>
                </div>
                {deal.sourceTotalCashReceived > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>Cash</span>
                        <span className="text-emerald-400 font-medium">−{formatCurrency(deal.sourceTotalCashReceived)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold border-t border-border/60 pt-1">
                    <span className="text-muted-foreground">Balance</span>
                    <span className={deal.sourceRemainingBalance > 0 ? "text-red-400" : "text-emerald-400"}>
                        {formatCurrency(deal.sourceRemainingBalance)}
                    </span>
                </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all", deal.isFullySettled ? "bg-emerald-500" : "bg-orange-500")}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}% received</p>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────
export default function ExchangeList() {
    const [collectionFilter, setCollectionFilter] = useState("all");
    const [page, setPage] = useState(1);

    const statsQuery = useQuery<ApiResponse<ExchangeStats>>({
        queryKey: ["exchange-stats"],
        queryFn: () => axios.get<ApiResponse<ExchangeStats>>("/exchanges/stats").then(r => r.data),
        staleTime: 60_000,
    });

    const listQuery = useQuery<ApiResponse<ExchangePaginatedData>>({
        queryKey: ["exchanges", collectionFilter, page],
        queryFn: () => axios.get<ApiResponse<ExchangePaginatedData>>("/exchanges", {
            params: {
                collection: collectionFilter === "all" ? undefined : collectionFilter,
                page,
                limit: 15,
            }
        }).then(r => r.data),
        staleTime: 30_000,
    });

    const stats = statsQuery.data?.data;
    const result = listQuery.data?.data;
    const deals = result?.data ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 shadow-md">
                            <ArrowLeftRight className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Exchanges</h1>
                    </div>
                    <p className="text-sm text-muted-foreground ml-11">
                        All vehicle exchange deals across Phase 2 &amp; Phase 3 inventory
                    </p>
                </div>
                <Button variant="outline" size="sm" className="border-border self-start"
                    onClick={() => { statsQuery.refetch(); listQuery.refetch(); }}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Exchanges"
                        value={stats.totalExchanges.toString()}
                        sub={`${stats.exchangesFromVehicles} vehicles · ${stats.exchangesFromConsignments} consignments`}
                        icon={ArrowLeftRight}
                        color="bg-gradient-to-br from-orange-500 to-rose-500"
                    />
                    <StatCard
                        label="Total Exchange Value"
                        value={formatCurrency(stats.totalExchangeValue)}
                        sub="Combined value of all exchanged vehicles"
                        icon={IndianRupee}
                        color="bg-gradient-to-br from-violet-500 to-purple-600"
                    />
                    <StatCard
                        label="Pending Balance"
                        value={formatCurrency(stats.totalRemainingBalance)}
                        sub={`${stats.pendingSettlement} deals pending cash`}
                        icon={AlertCircle}
                        color="bg-gradient-to-br from-amber-500 to-orange-600"
                    />
                    <StatCard
                        label="Fully Settled"
                        value={`${stats.fullySettled} / ${stats.totalExchanges}`}
                        sub={stats.totalExchanges > 0 ? `${((stats.fullySettled / stats.totalExchanges) * 100).toFixed(0)}% settlement rate` : "No exchanges yet"}
                        icon={CheckCircle2}
                        color="bg-gradient-to-br from-emerald-500 to-teal-600"
                    />
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground font-medium mr-1">Filter by:</p>
                <Select value={collectionFilter} onValueChange={v => { setCollectionFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-8 w-44 text-sm border-border bg-muted/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Exchanges</SelectItem>
                        <SelectItem value="vehicles">Vehicles Only</SelectItem>
                        <SelectItem value="consignmentVehicles">Consignments Only</SelectItem>
                    </SelectContent>
                </Select>
                {result && (
                    <p className="text-xs text-muted-foreground ml-auto">
                        {result.total} exchange{result.total !== 1 ? "s" : ""} found
                    </p>
                )}
            </div>

            {/* List */}
            {listQuery.isLoading ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center">
                    <RefreshCw className="h-8 w-8 text-muted-foreground/30 animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground">Loading exchange deals...</p>
                </div>
            ) : deals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 mx-auto mb-4">
                        <ArrowLeftRight className="h-8 w-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">No Exchanges Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Exchange deals appear here when you record a payment with <strong>Exchange Vehicle</strong> type on a vehicle sale or consignment buyer payment.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {deals.map((deal) => (
                        <div key={deal.exchangePaymentId}
                            className={cn(
                                "rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all",
                                !deal.isFullySettled && "border-l-4 border-l-orange-500/60"
                            )}>
                            {/* Card Header */}
                            <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-b border-border/60">
                                <div className="flex items-center gap-2">
                                    <ArrowLeftRight className="h-3.5 w-3.5 text-orange-400" />
                                    <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Exchange Deal</span>
                                    <span className="text-[10px] text-muted-foreground">· {formatDate(deal.exchangeDate)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {deal.isFullySettled ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] gap-1">
                                            <CheckCircle2 className="h-2.5 w-2.5" />Fully Settled
                                        </Badge>
                                    ) : deal.sourceRemainingBalance > 0 ? (
                                        <Badge className="bg-orange-500/10 text-orange-400 text-[10px] gap-1">
                                            <Clock className="h-2.5 w-2.5" />Cash Pending · {formatCurrency(deal.sourceRemainingBalance)}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">Exchange Only</Badge>
                                    )}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-border">
                                {/* Source Vehicle */}
                                <div className="p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Sold Vehicle</p>
                                    <SourceCell deal={deal} />
                                </div>

                                {/* Arrow separator on mobile */}
                                <div className="flex md:hidden items-center px-5 py-2 border-t border-border/60">
                                    <div className="flex-1 h-px bg-gradient-to-r from-muted/30 via-orange-500/30 to-muted/30" />
                                    <ArrowLeftRight className="h-4 w-4 text-orange-400 mx-3" />
                                    <div className="flex-1 h-px bg-gradient-to-r from-muted/30 via-orange-500/30 to-muted/30" />
                                </div>

                                {/* Exchange Vehicle */}
                                <div className="p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Exchange Vehicle Received</p>
                                    <ExchangeCell deal={deal} />
                                </div>

                                {/* Settlement */}
                                <div className="p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Settlement</p>
                                    <SettlementCell deal={deal} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {result && result.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                        Page {result.page} of {result.totalPages} · {result.total} total
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-border" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" className="border-border" onClick={() => setPage(p => Math.min(result.totalPages, p + 1))} disabled={page === result.totalPages}>
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
