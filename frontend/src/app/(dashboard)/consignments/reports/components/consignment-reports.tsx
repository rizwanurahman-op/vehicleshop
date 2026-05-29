"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState, useMemo } from "react";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import { getClientSession } from "@/lib/auth";
import { toast } from "sonner";
import {
    TrendingUp, TrendingDown, Store, CreditCard, Clock, AlertCircle,
    Loader2, Download, FileText, FileSpreadsheet, ChevronDown, BarChart3,
    DollarSign, Package, Calendar, X, Filter, ArrowUpRight, ArrowDownLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ReportData {
    profitLoss: IConsignmentVehicle[];
    openSettlements: IConsignmentVehicle[];
    agingReport: IConsignmentVehicle[];
    monthlyTrends: { byReceivedMonth: unknown[]; bySoldMonth: unknown[] };
    costAnalysis: {
        avgWorkshop?: number; avgSpareParts?: number; avgPainting?: number;
        avgWashing?: number; avgFuel?: number; avgPaperwork?: number;
        avgCommission?: number; avgOtherExpenses?: number; avgTotalRecon?: number;
    };
}

// ── Date Helpers ──────────────────────────────────────────────────────────────

type DatePreset = "all" | "today" | "this_week" | "this_month" | "this_year" | "last_year" | "custom";

const getPresetRange = (preset: DatePreset): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (preset === "today")       { const t = fmt(now); return { dateFrom: t, dateTo: t }; }
    if (preset === "this_week")   { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return { dateFrom: fmt(s), dateTo: fmt(now) }; }
    if (preset === "this_month")  return { dateFrom: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: fmt(now) };
    if (preset === "this_year")   return { dateFrom: fmt(new Date(now.getFullYear(), 0, 1)), dateTo: fmt(now) };
    if (preset === "last_year")   return { dateFrom: `${now.getFullYear() - 1}-01-01`, dateTo: `${now.getFullYear() - 1}-12-31` };
    return {};
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color, icon: Icon }: {
    label: string; value: string; sub?: string; color?: string;
    icon?: React.ComponentType<{ className?: string }>;
}) => (
    <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
            {Icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></div>}
        </div>
        <p className={cn("text-xl font-bold", color || "text-foreground")}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const ConsignmentReports = () => {
    const [saleType, setSaleType]       = useState("all");
    const [datePreset, setDatePreset]   = useState<DatePreset>("all");
    const [customFrom, setCustomFrom]   = useState("");
    const [customTo, setCustomTo]       = useState("");
    const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

    const dateRange = useMemo(() => {
        if (datePreset === "custom") return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
        return getPresetRange(datePreset);
    }, [datePreset, customFrom, customTo]);

    const pageParams: Record<string, string> = {};
    if (saleType !== "all")        pageParams.saleType  = saleType;
    if (dateRange.dateFrom)        pageParams.dateFrom  = dateRange.dateFrom;
    if (dateRange.dateTo)          pageParams.dateTo    = dateRange.dateTo;

    const isFilterActive = saleType !== "all" || datePreset !== "all";
    const clearFilters = () => { setSaleType("all"); setDatePreset("all"); setCustomFrom(""); setCustomTo(""); };

    // Export handler (mirrors vehicle reports page)
    const handleExport = async (format: "csv" | "pdf") => {
        setIsExporting(format);
        const tid = toast.loading(`Preparing ${format.toUpperCase()} export…`, { description: "Building P&L report" });
        try {
            const p = new URLSearchParams({ format, ...pageParams });
            const baseURL = (axios.defaults.baseURL ?? "").replace(/\/$/, "");
            const url = `${baseURL}/consignments/reports/export?${p.toString()}`;
            const token = getClientSession();
            const res = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            const fileName = `consignment_pl_report_${new Date().toISOString().slice(0, 10)}.${format}`;
            link.download = fileName;
            document.body.appendChild(link); link.click(); link.remove();
            URL.revokeObjectURL(link.href);
            toast.success(`${format.toUpperCase()} downloaded!`, { id: tid, description: `${fileName} saved to downloads` });
        } catch {
            toast.error("Export failed", { id: tid, description: "Could not generate the report. Please try again." });
        } finally { setIsExporting(null); }
    };

    const { data: report, isLoading } = useQuery<ReportData | null>({
        queryKey: ["consignment-reports", pageParams],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<ReportData>>("/consignments/reports", { params: pageParams });
            return res.data.data ?? null;
        },
    });

    // Derived stats
    const totalRevenue    = report?.profitLoss.reduce((s, v) => s + (v.soldPrice || 0), 0) ?? 0;
    const totalInvested   = report?.profitLoss.reduce((s, v) => s + (v.totalInvestment || 0), 0) ?? 0;
    const totalNetProfit  = report?.profitLoss.reduce((s, v) => s + v.netProfit, 0) ?? 0;
    const totalPaidOut    = report?.profitLoss.reduce((s, v) => s + (v.paidToPayee || 0), 0) ?? 0;
    const profitableCount = report?.profitLoss.filter(v => v.netProfit >= 0).length ?? 0;
    const parkSaleCount   = report?.profitLoss.filter(v => v.saleType === "park_sale").length ?? 0;
    const financeSaleCount = (report?.profitLoss.length ?? 0) - parkSaleCount;
    const avgDays         = report?.profitLoss.length
        ? Math.round(report.profitLoss.reduce((s, v) => s + (v.daysInShop || 0), 0) / report.profitLoss.length)
        : 0;
    const buyerBalance    = report?.openSettlements.reduce((s, v) => s + (v.buyerBalance || 0), 0) ?? 0;
    const payeeBalance    = report?.openSettlements.reduce((s, v) => s + (v.payeeBalance || 0), 0) ?? 0;

    return (
        <div className="flex w-full flex-col gap-6 pb-10">

            {/* ── Header ── */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
                            <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Consignment Reports</h1>
                            <p className="text-sm text-muted-foreground">Park Sale &amp; Finance Sale analytics</p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground self-start sm:self-auto" disabled={!!isExporting}>
                                {isExporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                                Export P&amp;L
                                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">P&amp;L Report — Download as</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport("csv")} disabled={isExporting === "csv"} className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                                <div><p className="text-sm font-medium">Export CSV</p><p className="text-[10px] text-muted-foreground">Excel compatible</p></div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={isExporting === "pdf"} className="gap-2 cursor-pointer">
                                <FileText className="h-4 w-4 text-red-500" />
                                <div><p className="text-sm font-medium">Export PDF</p><p className="text-[10px] text-muted-foreground">Formatted report</p></div>
                            </DropdownMenuItem>
                            {isFilterActive && (<><DropdownMenuSeparator /><p className="px-2 py-1 text-[10px] text-primary">✦ Exports respect active filters</p></>)}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* ── Filters ── */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-3 items-center">
                        <Select value={saleType} onValueChange={setSaleType}>
                            <SelectTrigger className="h-9 w-44 bg-muted/50 border-border">
                                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sale Types</SelectItem>
                                <SelectItem value="park_sale"><Store className="inline h-3.5 w-3.5 mr-1" />Park Sale</SelectItem>
                                <SelectItem value="finance_sale"><CreditCard className="inline h-3.5 w-3.5 mr-1" />Finance Sale</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                            <Calendar className="h-3.5 w-3.5" /><span className="font-medium">Date:</span>
                        </div>
                        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                            <SelectTrigger className="h-9 w-44 bg-muted/50 border-border">
                                <SelectValue placeholder="All Time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="this_week">This Week</SelectItem>
                                <SelectItem value="this_month">This Month</SelectItem>
                                <SelectItem value="this_year">This Year</SelectItem>
                                <SelectItem value="last_year">Last Year</SelectItem>
                                <SelectItem value="custom">Custom Range…</SelectItem>
                            </SelectContent>
                        </Select>
                        {datePreset === "custom" && (
                            <div className="flex items-center gap-2">
                                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-40 bg-muted/50 border-border text-sm" />
                                <span className="text-xs text-muted-foreground">to</span>
                                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-40 bg-muted/50 border-border text-sm" />
                            </div>
                        )}
                    </div>
                    {isFilterActive && (
                        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-primary">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                                <span className="font-medium">Filters active</span>
                                <span className="text-muted-foreground">— all sections filtered</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3" />Clear Filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
                </div>
            ) : (
                <>
                    {/* ── Summary Stats ── */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">P&amp;L Overview (Sold Vehicles)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatCard label="Total Sold" value={String(report?.profitLoss.length ?? 0)} sub={`${profitableCount} profitable deals`} icon={Package} />
                            <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub={`${parkSaleCount} park / ${financeSaleCount} finance`} icon={DollarSign} color="text-foreground" />
                            <StatCard label="Net Profit" value={formatCurrency(Math.abs(totalNetProfit))} sub={totalNetProfit >= 0 ? "Profitable" : "Net Loss"} icon={TrendingUp} color={totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400"} />
                            <StatCard label="Avg Days in Shop" value={avgDays ? `${avgDays}d` : "—"} sub="Turnaround time" icon={Clock} color="text-blue-400" />
                        </div>
                    </div>

                    {/* ── Park vs Finance split ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { label: "Park Sale 🏪", filter: "park_sale", color: "text-violet-400" },
                            { label: "Finance Sale 💳", filter: "finance_sale", color: "text-blue-400" },
                        ].map(({ label, filter, color }) => {
                            const items = report?.profitLoss.filter(v => v.saleType === filter) ?? [];
                            const rev   = items.reduce((s, v) => s + (v.soldPrice || 0), 0);
                            const inv   = items.reduce((s, v) => s + (v.totalInvestment || 0), 0);
                            const np    = items.reduce((s, v) => s + v.netProfit, 0);
                            const po    = items.reduce((s, v) => s + (v.paidToPayee || 0), 0);
                            return (
                                <div key={label} className="rounded-xl border border-border bg-card p-5">
                                    <p className="font-bold text-foreground mb-4">{label}</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { l: "Total Sold", v: String(items.length) },
                                            { l: "Invested", v: formatCurrency(inv) },
                                            { l: "Revenue", v: formatCurrency(rev) },
                                            { l: "Paid to Payee", v: formatCurrency(po) },
                                            { l: "Net Profit", v: formatCurrency(np) },
                                            { l: "Avg Days", v: items.length ? `${Math.round(items.reduce((s, v) => s + (v.daysInShop || 0), 0) / items.length)}d` : "—" },
                                        ].map(row => (
                                            <div key={row.l}>
                                                <p className="text-xs text-muted-foreground">{row.l}</p>
                                                <p className={cn("font-bold text-sm mt-0.5", row.l === "Net Profit" ? color : "text-foreground")}>{row.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Open Settlements ── */}
                    {!!(report?.openSettlements?.length) && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <AlertCircle className="h-4 w-4 text-orange-400" />
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Open Settlements</p>
                                <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                    {report.openSettlements.length} pending
                                </span>
                                {buyerBalance > 0 && (
                                    <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <ArrowUpRight className="h-3 w-3" />Buyer owes {formatCurrency(buyerBalance)}
                                    </span>
                                )}
                                {payeeBalance > 0 && (
                                    <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <ArrowDownLeft className="h-3 w-3" />We owe {formatCurrency(payeeBalance)}
                                    </span>
                                )}
                            </div>
                            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-orange-500/20 bg-orange-500/5">
                                                {["Vehicle", "Reg. No.", "Owner", "Sale Type", "Sold", "Buyer Owes", "We Owe", "Settlement"].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-orange-500/10">
                                            {report.openSettlements.map(v => (
                                                <tr key={v._id} className="hover:bg-orange-500/5 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-foreground whitespace-nowrap">{v.make} {v.model}</p>
                                                        <p className="text-xs text-muted-foreground">{v.consignmentId}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-mono text-foreground whitespace-nowrap">{v.registrationNo}</td>
                                                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{v.previousOwner}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", v.saleType === "park_sale" ? "bg-violet-500/15 text-violet-400" : "bg-blue-500/15 text-blue-400")}>
                                                            {v.saleType === "park_sale" ? "Park Sale" : "Finance Sale"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(v.dateSold!)}</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-amber-400 whitespace-nowrap">{(v.buyerBalance || 0) > 0 ? formatCurrency(v.buyerBalance) : "—"}</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-blue-400 whitespace-nowrap">{(v.payeeBalance || 0) > 0 ? formatCurrency(v.payeeBalance) : "—"}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                                                            v.settlementStatus === "fully_closed" ? "bg-green-500/15 text-green-400"
                                                            : v.settlementStatus === "buyer_settled" || v.settlementStatus === "payee_settled" ? "bg-amber-500/15 text-amber-400"
                                                            : "bg-orange-500/15 text-orange-400")}>
                                                            {(v.settlementStatus ?? "open").replace(/_/g, " ")}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── P&L Table ── */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Vehicle-wise P&amp;L (Sold Only)</p>
                        {!report?.profitLoss.length ? (
                            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">No sold consignments yet</div>
                        ) : (
                            <div className="rounded-xl border border-border bg-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                {["Vehicle", "Reg. No.", "Sale Type", "Received", "Sold", "Invested", "Sold Price", "Recon", "Paid Out", "Net Profit", "Days"].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {report.profitLoss.map(v => {
                                                const isProfit = v.netProfit >= 0;
                                                return (
                                                    <tr key={v._id} className="hover:bg-muted/10 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="font-semibold text-foreground whitespace-nowrap">{v.make} {v.model}</p>
                                                            <p className="text-[11px] text-muted-foreground">{v.consignmentId}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-foreground whitespace-nowrap">{v.registrationNo}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", v.saleType === "park_sale" ? "bg-violet-500/15 text-violet-400" : "bg-blue-500/15 text-blue-400")}>
                                                                {v.saleType === "park_sale" ? "Park" : "Finance"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(v.dateReceived)}</td>
                                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{v.dateSold ? formatDate(v.dateSold) : "—"}</td>
                                                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{formatCurrency(v.totalInvestment)}</td>
                                                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{formatCurrency(v.soldPrice || 0)}</td>
                                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">-{formatCurrency(v.totalReconCost)}</td>
                                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">-{formatCurrency(v.paidToPayee)}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={cn("flex items-center gap-1 font-bold text-sm", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                                {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                                {isProfit ? "+" : ""}{formatCurrency(v.netProfit)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{v.daysInShop != null ? `${v.daysInShop}d` : "—"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-border bg-muted/20">
                                                <td colSpan={5} className="px-4 py-3 text-sm font-bold text-foreground">Totals ({report.profitLoss.length} sold)</td>
                                                <td className="px-4 py-3 text-sm font-bold text-foreground whitespace-nowrap">{formatCurrency(totalInvested)}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-foreground whitespace-nowrap">{formatCurrency(totalRevenue)}</td>
                                                <td className="px-4 py-3"></td>
                                                <td className="px-4 py-3 text-sm font-bold text-muted-foreground whitespace-nowrap">-{formatCurrency(totalPaidOut)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={cn("text-sm font-bold", totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                        {totalNetProfit >= 0 ? "+" : ""}{formatCurrency(totalNetProfit)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">Avg {avgDays}d</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Aging Report ── */}
                    {!!(report?.agingReport?.length) && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aging Report — Vehicles Still in Shop</p>
                                <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{report.agingReport.length} vehicles</span>
                            </div>
                            <div className="rounded-xl border border-border bg-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[500px]">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                {["Vehicle", "Reg. No.", "Owner", "Sale Type", "Status", "Invested", "Days in Shop"].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {report.agingReport.map(v => {
                                                const isOld = (v.daysInShop ?? 0) > 30;
                                                return (
                                                    <tr key={v._id} className="hover:bg-muted/10 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="font-semibold text-foreground whitespace-nowrap">{v.make} {v.model}</p>
                                                            <p className="text-[11px] text-muted-foreground">{v.consignmentId}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-foreground whitespace-nowrap">{v.registrationNo}</td>
                                                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{v.previousOwner}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", v.saleType === "park_sale" ? "bg-violet-500/15 text-violet-400" : "bg-blue-500/15 text-blue-400")}>
                                                                {v.saleType === "park_sale" ? "Park" : "Finance"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="text-xs font-semibold text-muted-foreground">{(v.status ?? "").replace(/_/g, " ")}</span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{formatCurrency(v.totalInvestment)}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <Badge className={cn("text-[10px]", isOld ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20")}>
                                                                <Clock className="mr-1 h-2.5 w-2.5" />{v.daysInShop}d
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Cost Analysis ── */}
                    {report?.costAnalysis?.avgTotalRecon != null && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Avg Reconditioning Cost (sold vehicles)</p>
                            </div>
                            <div className="rounded-xl border border-border bg-card overflow-hidden">
                                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: "Workshop",   val: report.costAnalysis.avgWorkshop },
                                        { label: "Spare Parts",val: report.costAnalysis.avgSpareParts },
                                        { label: "Painting",   val: report.costAnalysis.avgPainting },
                                        { label: "Washing",    val: report.costAnalysis.avgWashing },
                                        { label: "Fuel",       val: report.costAnalysis.avgFuel },
                                        { label: "Paperwork",  val: report.costAnalysis.avgPaperwork },
                                        { label: "Commission", val: report.costAnalysis.avgCommission },
                                        { label: "Other",      val: report.costAnalysis.avgOtherExpenses },
                                    ].map(c => (
                                        <div key={c.label} className="text-center rounded-lg bg-muted/20 p-3">
                                            <p className="text-[11px] text-muted-foreground mb-1">{c.label}</p>
                                            <p className="text-sm font-semibold text-foreground">{formatCurrency(Math.round(c.val || 0))}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-border px-5 py-3 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-foreground">Avg Total Recon</span>
                                    <span className="text-sm font-bold text-primary">{formatCurrency(Math.round(report.costAnalysis.avgTotalRecon || 0))}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ConsignmentReports;
