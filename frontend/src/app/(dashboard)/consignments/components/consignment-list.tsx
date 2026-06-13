"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Plus, Search, Store, CreditCard, Bike, Car, Loader2,
    TrendingUp, TrendingDown, Package, AlertCircle,
    CheckCircle2, Clock, Filter, ArrowLeftRight,
    Download, FileText, FileSpreadsheet, ChevronDown, Calendar, X,
    ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight,
    Wrench,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { getClientSession } from "@/lib/auth";
import { toast } from "sonner";
import { AdminOnly } from "@components/shared";

type DatePreset = "all" | "today" | "yesterday" | "this_week" | "this_month" | "this_year" | "last_year" | "custom";

const getPresetRange = (preset: DatePreset): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (preset === "today") { const t = fmt(now); return { dateFrom: t, dateTo: t }; }
    if (preset === "yesterday") { const y = new Date(now); y.setDate(y.getDate() - 1); const t = fmt(y); return { dateFrom: t, dateTo: t }; }
    if (preset === "this_week") { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return { dateFrom: fmt(s), dateTo: fmt(now) }; }
    if (preset === "this_month") return { dateFrom: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: fmt(now) };
    if (preset === "this_year") return { dateFrom: fmt(new Date(now.getFullYear(), 0, 1)), dateTo: fmt(now) };
    if (preset === "last_year") return { dateFrom: `${now.getFullYear() - 1}-01-01`, dateTo: `${now.getFullYear() - 1}-12-31` };
    return {};
};

const fetchConsignments = async (params: Record<string, string | number>): Promise<ConsignmentPaginatedData | null> => {
    const res = await axios.get<ApiResponse<ConsignmentPaginatedData>>("/consignments", { params });
    return res.data.data ?? null;
};

const SaleTypeBadge = ({ type }: { type: SaleType }) => (
    <span className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
        type === "park_sale"
            ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    )}>
        {type === "park_sale" ? <><Store className="h-2.5 w-2.5" /> Park</> : <><CreditCard className="h-2.5 w-2.5" /> Finance</>}
    </span>
);

const StatusBadge = ({ status, settlement }: { status: ConsignmentStatus; settlement: SettlementStatus }) => {
    if (settlement === "fully_closed") return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"><CheckCircle2 className="mr-1 h-2.5 w-2.5" />Closed</Badge>;
    if (status === "sold" || status === "sold_pending") {
        return (
            <div className="flex flex-col gap-0.5">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]"><CheckCircle2 className="mr-1 h-2.5 w-2.5" />Sold</Badge>
                {settlement !== "buyer_settled" && (
                    <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]"><AlertCircle className="mr-1 h-2.5 w-2.5" />Pending</Badge>
                )}
            </div>
        );
    }
    const map: Record<string, { label: string; color: string }> = {
        received: { label: "Received", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
        reconditioning: { label: "Workshop", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
        ready_for_sale: { label: "Ready", color: "bg-green-500/10 text-green-400 border-green-500/20" },
        returned: { label: "Returned", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    };
    const s = map[status] ?? map.received;
    return <Badge className={cn("text-[10px]", s.color)}>{s.label}</Badge>;
};



export const ConsignmentList = ({ initialData }: { initialData: ConsignmentPaginatedData | null }) => {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [saleType, setSaleType] = useState<string>("all");
    const [status, setStatus] = useState<string>("all");
    const [datePreset, setDatePreset] = useState<DatePreset>("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const dateRange = useMemo(() => {
        if (datePreset === "custom") return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
        return getPresetRange(datePreset);
    }, [datePreset, customFrom, customTo]);

    const isAnyFilterActive = debouncedSearch !== "" || saleType !== "all" || status !== "all" || datePreset !== "all";

    const clearFilters = () => {
        setSearch(""); setDebouncedSearch(""); setSaleType("all"); setStatus("all");
        setDatePreset("all"); setCustomFrom(""); setCustomTo(""); setPage(1);
    };

    const params: Record<string, string | number> = { page, limit: 20 };
    if (saleType !== "all") params.saleType = saleType;
    if (status !== "all") params.status = status;
    if (debouncedSearch) params.search = debouncedSearch;
    if (dateRange.dateFrom) params.dateFrom = dateRange.dateFrom;
    if (dateRange.dateTo) params.dateTo = dateRange.dateTo;

    const { data, isLoading } = useQuery<ConsignmentPaginatedData | null>({
        queryKey: ["consignments", params],
        queryFn: () => fetchConsignments(params),
        initialData: saleType === "all" && status === "all" && !debouncedSearch && datePreset === "all" && page === 1 ? initialData : undefined,
    });

    const handleExport = async (format: "csv" | "pdf") => {
        setIsExporting(format);
        const tid = toast.loading(`Preparing ${format.toUpperCase()} export…`, { description: "Building your consignment inventory report" });
        try {
            const p = new URLSearchParams({ format });
            if (debouncedSearch) p.set("search", debouncedSearch);
            if (saleType !== "all") p.set("saleType", saleType);
            if (status !== "all") p.set("status", status);
            if (dateRange.dateFrom) p.set("dateFrom", dateRange.dateFrom);
            if (dateRange.dateTo) p.set("dateTo", dateRange.dateTo);
            const baseURL = (axios.defaults.baseURL ?? "").replace(/\/$/, "");
            const url = `${baseURL}/consignments/export?${p.toString()}`;
            const token = getClientSession();
            const res = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            const fileName = `consignments_${new Date().toISOString().slice(0, 10)}.${format}`;
            link.download = fileName;
            document.body.appendChild(link); link.click(); link.remove();
            URL.revokeObjectURL(link.href);
            toast.success(`${format.toUpperCase()} downloaded!`, { id: tid, description: `${fileName} saved to your downloads folder` });
        } catch {
            toast.error("Export failed", { id: tid, description: "Could not generate the report. Please try again." });
        } finally {
            setIsExporting(null);
        }
    };

    const vehicles = data?.data ?? [];
    const meta = data ? { total: data.total, page: data.page, totalPages: data.totalPages } : null;

    // Fetch backend stats for accurate totals (not page-limited)
    const { data: stats } = useQuery<IConsignmentDashboardStats | null>({
        queryKey: ["consignment-stats", saleType !== "all" ? saleType : undefined],
        queryFn: async () => {
            const p: Record<string, string> = {};
            if (saleType !== "all") p.saleType = saleType;
            const res = await axios.get<ApiResponse<IConsignmentDashboardStats>>("/consignments/stats", { params: p });
            return res.data.data ?? null;
        },
    });

    const inShop = stats?.currentlyInShop ?? 0;
    const sold = stats?.sold ?? 0;
    const totalCount = stats?.totalVehicles ?? (data?.total ?? 0);
    const totalNetProfit = stats?.totalNetProfit ?? 0;
    const isProfit = totalNetProfit >= 0;
    const ps = stats?.parkSale;
    const fs = stats?.financeSale;

    return (
        <div className="flex flex-col gap-5 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
                        <Store className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Consignment Inventory</h1>
                        <p className="text-sm text-muted-foreground">Park Sale &amp; Finance Sale vehicles</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground" disabled={!!isExporting}>
                                {isExporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                                Export
                                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Download as</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport("csv")} disabled={isExporting === "csv"} className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                                <div><p className="text-sm font-medium">Export CSV</p><p className="text-[10px] text-muted-foreground">Excel compatible</p></div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={isExporting === "pdf"} className="gap-2 cursor-pointer">
                                <FileText className="h-4 w-4 text-red-500" />
                                <div><p className="text-sm font-medium">Export PDF</p><p className="text-[10px] text-muted-foreground">Formatted report</p></div>
                            </DropdownMenuItem>
                            {isAnyFilterActive && (
                                <><DropdownMenuSeparator /><p className="px-2 py-1 text-[10px] text-primary">✦ Exports respect active filters</p></>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AdminOnly>
                        <Link href="/consignments/new">
                            <Button className="bg-gradient-brand text-white hover:opacity-90 shadow-md cursor-pointer">
                                <Plus className="mr-2 h-4 w-4" /> New Consignment
                            </Button>
                        </Link>
                    </AdminOnly>
                </div>
            </div>


            {/* ── Consignment Dashboard ───────────────────────────────── */}
            <div className="flex flex-col gap-3">

                {/* Row 1: Summary overview (6 cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold tabular-nums text-foreground">{totalCount}</p>
                        <p className="text-[10px] text-muted-foreground">{ps?.total ?? 0} park · {fs?.total ?? 0} finance</p>
                    </div>
                    {inShop > 0 ? (
                        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex flex-col gap-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70">In Shop</p>
                            <p className="text-2xl font-bold tabular-nums text-yellow-400">{inShop}</p>
                            <p className="text-[10px] text-muted-foreground">{ps?.inShop ?? 0} park · {fs?.inShop ?? 0} finance</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col gap-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">In Shop</p>
                            <p className="text-2xl font-bold tabular-nums text-emerald-400">0</p>
                            <p className="text-[10px] text-emerald-500/60">All vehicles sold ✓</p>
                        </div>
                    )}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">Sold</p>
                        <p className="text-2xl font-bold tabular-nums text-emerald-400">{sold}</p>
                        <p className="text-[10px] text-muted-foreground">{ps?.sold ?? 0} park · {fs?.sold ?? 0} finance</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recon Spent</p>
                        <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(stats?.totalReconCost ?? 0)}</p>
                        <p className="text-[10px] text-muted-foreground">Workshop, parts, etc.</p>
                    </div>
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500/70">Total Revenue</p>
                        <p className="text-lg font-bold tabular-nums text-blue-400">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
                        <p className="text-[10px] text-muted-foreground">From {sold} sold vehicles</p>
                    </div>
                    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${isProfit ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                        <div className="flex items-center gap-1">
                            {isProfit ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isProfit ? "text-emerald-500/70" : "text-red-500/70"}`}>Net Profit</p>
                        </div>
                        <p className={`text-lg font-bold tabular-nums ${isProfit ? "text-emerald-400" : "text-red-400"}`}>{isProfit ? "+" : "−"}{formatCurrency(Math.abs(totalNetProfit))}</p>
                        <p className="text-[10px] text-muted-foreground">Avg margin: {stats?.avgMargin ?? 0}%</p>
                    </div>
                </div>

                {/* Row 2: Domain split (Park Sale | Finance Sale) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                    {/* Park Sale card */}
                    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15">
                                <Store className="h-4 w-4 text-violet-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">Park Sale</p>
                                <p className="text-[10px] text-muted-foreground">{ps?.total ?? 0} vehicles · {ps?.inShop ?? 0} in shop · {ps?.sold ?? 0} sold</p>
                            </div>
                            {(ps?.fullyClosed ?? 0) > 0 && (
                                <span className="ml-auto text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                    {ps?.fullyClosed} closed
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/30 border border-border p-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    <ArrowDownLeft className="inline h-3 w-3 mr-1 text-emerald-400" />Buyer Received
                                </p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(ps?.totalReceivedFromBuyers ?? 0)}</p>
                                {(ps?.totalBuyerBalance ?? 0) > 0 && (
                                    <p className="text-[10px] text-amber-400 mt-0.5">₹{(ps?.totalBuyerBalance ?? 0).toLocaleString("en-IN")} pending</p>
                                )}
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border p-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    <ArrowUpRight className="inline h-3 w-3 mr-1 text-violet-400" />Paid to Owner
                                </p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(ps?.totalPaidToOwner ?? 0)}</p>
                                {(ps?.totalOwnerBalance ?? 0) > 0 && (
                                    <p className="text-[10px] text-amber-400 mt-0.5">₹{(ps?.totalOwnerBalance ?? 0).toLocaleString("en-IN")} owed</p>
                                )}
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border p-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    <Wrench className="inline h-3 w-3 mr-1" />Recon Cost
                                </p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(ps?.totalReconCost ?? 0)}</p>
                            </div>
                            <div className={`rounded-lg border p-3 ${ (ps?.totalNetProfit ?? 0) >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Net Profit</p>
                                <p className={`text-base font-bold tabular-nums ${ (ps?.totalNetProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {(ps?.totalNetProfit ?? 0) >= 0 ? "+" : "−"}{formatCurrency(Math.abs(ps?.totalNetProfit ?? 0))}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Finance Sale card */}
                    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15">
                                <CreditCard className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">Finance Sale</p>
                                <p className="text-[10px] text-muted-foreground">{fs?.total ?? 0} vehicles · {fs?.inShop ?? 0} in shop · {fs?.sold ?? 0} sold</p>
                            </div>
                            {(fs?.fullyClosed ?? 0) > 0 && (
                                <span className="ml-auto text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                    {fs?.fullyClosed} closed
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/30 border border-border p-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    <ArrowDownLeft className="inline h-3 w-3 mr-1 text-emerald-400" />Buyer Received
                                </p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(fs?.totalReceivedFromBuyers ?? 0)}</p>
                                {(fs?.totalBuyerBalance ?? 0) > 0 && (
                                    <p className="text-[10px] text-amber-400 mt-0.5">₹{(fs?.totalBuyerBalance ?? 0).toLocaleString("en-IN")} pending</p>
                                )}
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border p-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    <ArrowUpRight className="inline h-3 w-3 mr-1 text-blue-400" />Paid to Finance
                                </p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(fs?.totalPaidToFinance ?? 0)}</p>
                                {(fs?.totalFinanceBalance ?? 0) > 0 && (
                                    <p className="text-[10px] text-amber-400 mt-0.5">₹{(fs?.totalFinanceBalance ?? 0).toLocaleString("en-IN")} owed</p>
                                )}
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border p-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    <Wrench className="inline h-3 w-3 mr-1" />Recon Cost
                                </p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(fs?.totalReconCost ?? 0)}</p>
                            </div>
                            <div className={`rounded-lg border p-3 ${ (fs?.totalNetProfit ?? 0) >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Net Profit</p>
                                <p className={`text-base font-bold tabular-nums ${ (fs?.totalNetProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {(fs?.totalNetProfit ?? 0) >= 0 ? "+" : "−"}{formatCurrency(Math.abs(fs?.totalNetProfit ?? 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 3: Pending alerts strip (only if there are pending amounts) */}
                {((stats?.totalBuyerBalance ?? 0) > 0 || (stats?.totalPayeeBalance ?? 0) > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(stats?.totalBuyerBalance ?? 0) > 0 && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                                        <ArrowDownLeft className="h-4 w-4 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-400">Pending from Buyers</p>
                                        <p className="text-[10px] text-muted-foreground">{stats?.pendingBuyerPayments.count} vehicle(s) with balance due</p>
                                    </div>
                                </div>
                                <p className="text-base font-bold tabular-nums text-amber-400">{formatCurrency(stats?.totalBuyerBalance ?? 0)}</p>
                            </div>
                        )}
                        {(stats?.totalPayeeBalance ?? 0) > 0 && (
                            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
                                        <ArrowUpRight className="h-4 w-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-orange-400">Still Owed to Owner / Finance</p>
                                        <p className="text-[10px] text-muted-foreground">{stats?.pendingPayeePayments.count} vehicle(s) with payee balance</p>
                                    </div>
                                </div>
                                <p className="text-base font-bold tabular-nums text-orange-400">{formatCurrency(stats?.totalPayeeBalance ?? 0)}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Sale Type Tabs */}
                    <div className="flex flex-wrap gap-1 bg-muted rounded-lg p-1">
                        {[
                            { value: "all", label: "All" },
                            { value: "park_sale", label: "🏪 Park Sale" },
                            { value: "finance_sale", label: "💳 Finance Sale" },
                        ].map(t => (
                            <button key={t.value} onClick={() => { setSaleType(t.value); setPage(1); }}
                                className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                    saleType === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search consignments..." className="pl-8 h-10 bg-muted/50 border-border text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                        <SelectTrigger className="h-10 w-44 bg-muted/50 border-border text-sm">
                            <Filter className="h-3 w-3 mr-1" /><SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="reconditioning">Workshop</SelectItem>
                            <SelectItem value="ready_for_sale">Ready for Sale</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                            <SelectItem value="sold_pending">Sold (Pending)</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Range Row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-medium">Received Date:</span>
                    </div>
                    <Select value={datePreset} onValueChange={(v) => { setDatePreset(v as DatePreset); setPage(1); }}>
                        <SelectTrigger className="h-10 w-full sm:w-48 bg-muted/50 border-border">
                            <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="this_year">This Year</SelectItem>
                            <SelectItem value="last_year">Last Year</SelectItem>
                            <SelectItem value="custom">Custom Range…</SelectItem>
                        </SelectContent>
                    </Select>
                    {datePreset === "custom" && (
                        <div className="flex items-center gap-2">
                            <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} className="h-10 w-40 bg-muted/50 border-border text-sm" />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} className="h-10 w-40 bg-muted/50 border-border text-sm" />
                        </div>
                    )}
                </div>

                {/* Active Filters Indicator */}
                {isAnyFilterActive && (
                    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                            <span className="font-medium">Filters active</span>
                            <span className="text-muted-foreground">— showing filtered results</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50">
                            <X className="h-3 w-3" /> Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : vehicles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No consignment vehicles found</p>
                        <AdminOnly>
                            <Link href="/consignments/new"><Button variant="outline" size="sm">Register First Vehicle</Button></Link>
                        </AdminOnly>
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards View (< md) */}
                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                            {vehicles.map((v) => {
                                const VehicleIcon = v.vehicleType === "two_wheeler" ? Bike : Car;
                                const isSold = !!(v.dateSold && v.soldPrice);
                                const isProfit = v.netProfit >= 0;

                                return (
                                    <div key={v._id} onClick={() => router.push(`/consignments/${v._id}`)} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden cursor-pointer">
                                        {/* Decorative background glow */}
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                        {/* Header: Date & Status */}
                                        <div className="relative flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                <span className={cn("flex items-center justify-center h-6 w-6 rounded", v.saleType === "park_sale" ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400")}>
                                                    <VehicleIcon className="h-3.5 w-3.5" />
                                                </span>
                                                {formatDate(v.dateReceived)}
                                            </div>
                                            <StatusBadge status={v.status} settlement={v.settlementStatus} />
                                        </div>

                                        {/* Vehicle & Seller */}
                                        <div className="relative mb-5 flex flex-col items-start">
                                            <p className="text-lg font-bold text-foreground tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{v.make} {v.model}</p>
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className="text-[11px] font-medium text-muted-foreground">REG: <span className="text-foreground">{v.registrationNo}</span></span>
                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">{v.consignmentId}</span>
                                                <SaleTypeBadge type={v.saleType} />
                                                {v.isExchange && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                        <ArrowLeftRight className="h-2 w-2" />Exchange Sale
                                                    </span>
                                                )}
                                                {v.isFromExchange && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        <ArrowLeftRight className="h-2 w-2" />Exchanged In
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 border border-border/50">
                                                <span className="text-[10px] font-medium text-muted-foreground">Owner: <span className="text-xs font-medium text-foreground truncate max-w-[150px] inline-block align-bottom">{v.previousOwner}</span></span>
                                                {v.daysInShop != null && <span className="text-[10px] text-muted-foreground ml-1 shrink-0 flex items-center gap-1">· <Clock className="h-2.5 w-2.5" />{v.daysInShop}d</span>}
                                            </div>
                                        </div>

                                        {/* Financial Section */}
                                        <div className="relative mt-auto pt-4 border-t border-border/60 border-dashed">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Invested</p>
                                                    <p className="text-xl font-bold text-foreground tabular-nums leading-none tracking-tight">{formatCurrency(v.totalInvestment)}</p>
                                                </div>
                                                <div className="text-right">
                                                    {isSold ? (
                                                        <>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Net Profit</p>
                                                            <span className={cn("inline-flex items-center justify-end gap-1 font-bold text-base tabular-nums leading-none", isProfit ? "text-emerald-500" : "text-red-500")}>
                                                                {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                                {isProfit ? "+" : ""}{formatCurrency(v.netProfit)}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-end h-full justify-end">
                                                            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 border border-border/40 rounded px-2 py-1">Unrealized</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block">
                            {/* Table Header */}
                            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-6"></div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle</p>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Received</p>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Investment</p>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                            </div>

                            {/* Rows */}
                            {vehicles.map((v, i) => {
                                const VehicleIcon = v.vehicleType === "two_wheeler" ? Bike : Car;
                                const isSold = !!(v.dateSold && v.soldPrice);
                                const isProfit = v.netProfit >= 0;

                                return (
                                    <div key={v._id}
                                        className={cn("grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors", i > 0 ? "border-t border-border" : "")}
                                        onClick={() => router.push(`/consignments/${v._id}`)}>

                                        <div className="flex items-center">
                                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-sm", v.saleType === "park_sale" ? "bg-violet-500/10" : "bg-blue-500/10")}>
                                                <VehicleIcon className={cn("h-4 w-4", v.saleType === "park_sale" ? "text-violet-400" : "text-blue-400")} />
                                            </div>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-foreground text-sm">{v.make} {v.model}</span>
                                                <SaleTypeBadge type={v.saleType} />
                                                <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{v.consignmentId}</span>
                                                {v.isExchange && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                        <ArrowLeftRight className="h-2.5 w-2.5" />Sold via Exchange
                                                    </span>
                                                )}
                                                {v.isFromExchange && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        <ArrowLeftRight className="h-2.5 w-2.5" />From Exchange
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                                <span className="font-mono">{v.registrationNo}</span>
                                                <span>•</span>
                                                <span>{v.previousOwner}</span>
                                                {v.daysInShop != null && (
                                                    <><span>•</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.daysInShop}d</span></>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center text-xs text-muted-foreground">
                                            {formatDate(v.dateReceived)}
                                        </div>

                                        <div className="flex items-center">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-foreground">{formatCurrency(v.totalInvestment)}</p>
                                                {isSold && (
                                                    <p className={cn("text-[11px]", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                        {isProfit ? "+" : ""}{formatCurrency(v.netProfit)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <StatusBadge status={v.status} settlement={v.settlementStatus} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {meta && meta.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-border px-5 py-3">
                                <p className="text-xs text-muted-foreground">Page {meta.page} of {meta.totalPages} ({meta.total} consignments)</p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 border-border"><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 border-border"><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ConsignmentList;
