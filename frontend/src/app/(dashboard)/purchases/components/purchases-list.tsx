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
import { Badge } from "@/components/ui/badge";
import {
    ShoppingCart, Search, Filter, ChevronLeft, ChevronRight, Eye,
    CheckCircle2, Clock, AlertTriangle, IndianRupee, Wallet, Ban,
    TrendingUp, Bike, Car, User
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import VehicleTypeIcon from "../../vehicles/components/vehicle-type-icon";

// ── Types ──────────────────────────────────────────────────────────
interface PurchaseStats {
    totalPurchasePrice: number;
    totalPaid: number;
    totalPending: number;
    pendingCount: number;
    fullyPaidCount: number;
}

interface PurchaseVehicle {
    _id: string;
    vehicleId: string;
    vehicleType: VehicleType;
    make: string;
    model: string;
    registrationNo: string;
    purchasedFrom: string;
    purchasedFromPhone?: string;
    datePurchased: string;
    purchasePrice: number;
    purchasePaymentStatus: "paid" | "partial" | "pending";
    purchasePendingAmount: number;
    totalInvestment: number;
    status: string;
    fundingSource: string;
}

interface PurchaseRegisterData {
    data: PurchaseVehicle[];
    total: number;
    page: number;
    totalPages: number;
    stats: PurchaseStats;
}

// ── Sub-components ─────────────────────────────────────────────────
const PaymentStatusBadge = ({ status }: { status: PurchaseVehicle["purchasePaymentStatus"] }) => {
    if (status === "paid") {
        return (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />Fully Paid
            </Badge>
        );
    }
    if (status === "partial") {
        return (
            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] gap-1">
                <Clock className="h-2.5 w-2.5" />Partial
            </Badge>
        );
    }
    return (
        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] gap-1">
            <Ban className="h-2.5 w-2.5" />Not Paid
        </Badge>
    );
};

const StatCard = ({
    label, value, sub, color = "text-foreground", bg = "bg-card border-border", icon: Icon,
}: { label: string; value: string; sub?: string; color?: string; bg?: string; icon: React.ElementType }) => (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", bg)}>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            bg.includes("emerald") ? "bg-emerald-400/15"
                : bg.includes("red") ? "bg-red-400/15"
                    : bg.includes("orange") ? "bg-orange-400/15"
                        : "bg-primary/10")}>
            <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">{label}</p>
            <p className={cn("text-lg font-bold leading-tight", color)}>{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    </div>
);

const fetchPurchases = async (params: Record<string, string | number>): Promise<PurchaseRegisterData | null> => {
    const res = await axios.get<ApiResponse<PurchaseRegisterData>>("/vehicles/reports/purchases", { params });
    return res.data.data ?? null;
};

// ── Main Component ─────────────────────────────────────────────────
const PurchasesList = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [vehicleType, setVehicleType] = useState("all");
    const [paymentStatus, setPaymentStatus] = useState("all");

    const debouncedSearch = useDebounce(search, 300);

    const params: Record<string, string | number> = { page, limit: 20 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (vehicleType !== "all") params.vehicleType = vehicleType;
    if (paymentStatus !== "all") params.paymentStatus = paymentStatus;

    const resetPage = () => setPage(1);

    const { data, isLoading } = useQuery<PurchaseRegisterData | null>({
        queryKey: ["purchases", { page, debouncedSearch, vehicleType, paymentStatus }],
        queryFn: () => fetchPurchases(params),
        retry: 0,
    });

    const records = data?.data ?? [];
    const stats = data?.stats;
    const meta = data ? { total: data.total, page: data.page, totalPages: data.totalPages } : null;

    return (
        <div className="flex w-full flex-col gap-5 pb-6">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                        <ShoppingCart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Purchase Register</h1>
                        <p className="text-sm text-muted-foreground">Track all vehicle purchases and payments due to sellers</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                        label="Total Purchase Value"
                        value={formatCurrency(stats.totalPurchasePrice)}
                        sub={`${meta?.total ?? 0} vehicles`}
                        icon={IndianRupee}
                        bg="bg-card border-border"
                    />
                    <StatCard
                        label="Paid to Sellers"
                        value={formatCurrency(stats.totalPaid)}
                        sub={`${stats.fullyPaidCount} fully paid`}
                        color="text-emerald-400"
                        bg="bg-emerald-500/5 border-emerald-500/20"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Pending to Sellers"
                        value={formatCurrency(stats.totalPending)}
                        sub={`${stats.pendingCount} vehicles due`}
                        color="text-red-400"
                        bg="bg-red-500/5 border-red-500/20"
                        icon={AlertTriangle}
                    />
                    <StatCard
                        label="Total Investment"
                        value={formatCurrency(stats.totalPaid)}
                        sub="Purchase price paid"
                        color="text-blue-400"
                        bg="bg-blue-500/5 border-blue-500/20"
                        icon={Wallet}
                    />
                </div>
            )}

            {/* Pending alert */}
            {stats && stats.pendingCount > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">
                        <strong className="text-red-400">{stats.pendingCount}</strong> vehicle{stats.pendingCount !== 1 ? "s" : ""} with payment due to sellers — total{" "}
                        <strong className="text-red-400">{formatCurrency(stats.totalPending)}</strong> pending.
                    </p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 h-10 bg-muted/50 border-border"
                        placeholder="Search vehicle, seller, reg.no..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                    />
                </div>
                <Select value={vehicleType} onValueChange={(v) => { setVehicleType(v); resetPage(); }}>
                    <SelectTrigger className="h-10 w-44 bg-muted/50 border-border">
                        <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all"><span className="flex items-center gap-2">All Types</span></SelectItem>
                        <SelectItem value="two_wheeler"><span className="flex items-center gap-2"><Bike className="h-3.5 w-3.5" />Two Wheelers</span></SelectItem>
                        <SelectItem value="four_wheeler"><span className="flex items-center gap-2"><Car className="h-3.5 w-3.5" />Four Wheelers</span></SelectItem>
                    </SelectContent>
                </Select>
                <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); resetPage(); }}>
                    <SelectTrigger className="h-10 w-44 bg-muted/50 border-border">
                        <SelectValue placeholder="All Payments" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="paid">✅ Fully Paid</SelectItem>
                        <SelectItem value="partial">🔶 Partial</SelectItem>
                        <SelectItem value="pending">🔴 Not Paid</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Data View */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Mobile Cards View (< md) */}
                <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/40 border border-border/50" />
                        ))
                    ) : records.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-30" />
                            No vehicles found
                        </div>
                    ) : (
                        records.map((v) => {
                            const paidAmount = v.purchasePrice - v.purchasePendingAmount;
                            const paidPct = v.purchasePrice > 0 ? (paidAmount / v.purchasePrice) * 100 : 100;
                            return (
                                <Link key={v._id} href={`/vehicles/${v._id}`} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden">
                                    {/* Decorative background glow */}
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    
                                    {/* Top colored status bar */}
                                    {v.purchasePendingAmount > 0 ? (
                                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-orange-400 to-red-500" />
                                    ) : (
                                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                                    )}

                                    {/* Header: Date & Status */}
                                    <div className="relative flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            <span className="flex items-center justify-center h-6 w-6 rounded bg-muted/80">
                                                <VehicleTypeIcon type={v.vehicleType} className="h-3.5 w-3.5" />
                                            </span>
                                            {formatDate(v.datePurchased)}
                                        </div>
                                        <PaymentStatusBadge status={v.purchasePaymentStatus} />
                                    </div>

                                    {/* Vehicle & Seller */}
                                    <div className="relative mb-5 flex flex-col items-start">
                                        <p className="text-lg font-bold text-foreground tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{v.make} {v.model}</p>
                                        <p className="text-[11px] font-medium text-muted-foreground mb-3">REG: <span className="text-foreground">{v.registrationNo}</span></p>
                                        
                                        <div className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 border border-border/50">
                                            <div className="h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <span className="text-xs font-medium text-foreground truncate max-w-[110px] sm:max-w-[180px]">{v.purchasedFrom}</span>
                                            {v.purchasedFromPhone && <span className="text-[10px] text-muted-foreground ml-1 shrink-0">· {v.purchasedFromPhone}</span>}
                                        </div>
                                    </div>

                                    {/* Price & Balance Section - Bank App Style */}
                                    <div className="relative mt-auto pt-4 border-t border-border/60 border-dashed">
                                        <div className="flex items-end justify-between mb-4">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Price</p>
                                                <p className="text-xl font-bold text-foreground tabular-nums leading-none tracking-tight">{formatCurrency(v.purchasePrice)}</p>
                                            </div>
                                            <div className="text-right">
                                                {v.purchasePendingAmount > 0 ? (
                                                    <>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Due Balance</p>
                                                        <p className="text-base font-bold text-red-500 tabular-nums leading-none">{formatCurrency(v.purchasePendingAmount)}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1.5">Fully Settled</p>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                            <p className="text-sm font-bold text-emerald-500 tabular-nums leading-none">{formatCurrency(paidAmount)}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Bar & Details */}
                                        <div>
                                            <div className="relative h-1.5 w-full rounded-full bg-muted/80 overflow-hidden mb-2">
                                                <div 
                                                    className={cn("absolute top-0 left-0 h-full transition-all duration-700 ease-out", 
                                                        paidPct >= 100 ? "bg-emerald-500" : paidPct > 0 ? "bg-gradient-to-r from-orange-400 to-emerald-400" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${Math.min(paidPct, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] text-muted-foreground font-semibold">Paid: <span className="text-foreground">{formatCurrency(paidAmount)}</span></p>
                                                <p className="text-[10px] text-muted-foreground font-semibold">{paidPct.toFixed(0)}% Completed</p>
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
                    <table className="w-full min-w-[800px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {["Type", "Date", "Vehicle", "Seller", "Purchase Price", "Paid", "Pending", "Status", "View"].map((h) => (
                                    <th key={h} className={cn(
                                        "px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider",
                                        ["Purchase Price", "Paid", "Pending"].includes(h) ? "text-right" : h === "Status" || h === "View" ? "text-center" : "text-left"
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 9 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted/60" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No vehicles found
                                    </td>
                                </tr>
                            ) : (
                                records.map((v) => {
                                    const paidAmount = v.purchasePrice - v.purchasePendingAmount;
                                    const paidPct = v.purchasePrice > 0 ? (paidAmount / v.purchasePrice) * 100 : 100;
                                    return (
                                        <tr key={v._id} className="hover:bg-muted/20 transition-colors group">
                                            <td className="px-4 py-3">
                                                <VehicleTypeIcon type={v.vehicleType} className="text-muted-foreground" />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDate(v.datePurchased)}
                                            </td>
                                            <td className="px-4 py-3 min-w-[160px]">
                                                <p className="font-semibold text-foreground">{v.make} {v.model}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <p className="text-[11px] text-muted-foreground font-mono">{v.registrationNo}</p>
                                                    <span className="text-[10px] text-muted-foreground/50">{v.vehicleId}</span>
                                                </div>
                                                {/* Payment progress bar */}
                                                <div className="mt-1.5 h-1 w-full max-w-[120px] rounded-full bg-muted/60">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", paidPct >= 100 ? "bg-emerald-500" : paidPct > 0 ? "bg-orange-400" : "bg-red-500")}
                                                        style={{ width: `${Math.min(paidPct, 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-foreground">{v.purchasedFrom}</p>
                                                {v.purchasedFromPhone && (
                                                    <p className="text-[11px] text-muted-foreground">{v.purchasedFromPhone}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                                                {formatCurrency(v.purchasePrice)}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className="font-semibold text-emerald-400">{formatCurrency(paidAmount)}</span>
                                                <p className="text-[10px] text-muted-foreground">{paidPct.toFixed(0)}%</p>
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className={cn("font-semibold", v.purchasePendingAmount > 0 ? "text-red-400" : "text-emerald-400")}>
                                                    {formatCurrency(v.purchasePendingAmount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <PaymentStatusBadge status={v.purchasePaymentStatus} />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Link href={`/vehicles/${v._id}`}>
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
                        {/* Summary footer row */}
                        {stats && records.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-border bg-muted/20 font-bold text-sm">
                                    <td colSpan={4} className="px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider">
                                        Page Subtotal
                                    </td>
                                    <td className="px-4 py-3 text-right text-foreground">
                                        {formatCurrency(records.reduce((s, v) => s + v.purchasePrice, 0))}
                                    </td>
                                    <td className="px-4 py-3 text-right text-emerald-400">
                                        {formatCurrency(records.reduce((s, v) => s + (v.purchasePrice - v.purchasePendingAmount), 0))}
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-400">
                                        {formatCurrency(records.reduce((s, v) => s + v.purchasePendingAmount, 0))}
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Page {meta.page} of {meta.totalPages} &nbsp;·&nbsp; {meta.total} total vehicles
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

            {/* Summary help text */}
            <div className="flex items-start gap-2 rounded-xl border border-border bg-card/60 px-4 py-3">
                <TrendingUp className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Tip:</strong> Click the eye icon on any row to open the vehicle detail page where you can record purchase payments and track full payment history.
                </p>
            </div>
        </div>
    );
};

export default PurchasesList;
