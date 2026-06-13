"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { formatCurrency } from "@lib/currency";
import { toast } from "sonner";
import {
    Users, Search, Download, FileText, FileSpreadsheet,
    ChevronDown, Loader2, X, Calendar, TrendingUp, TrendingDown,
    IndianRupee, AlertCircle, CheckCircle2, Sparkles,
} from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TableSkeleton, StatusBadge, CurrencyDisplay } from "@components/shared";
import { useDebounce } from "@hooks/use-debounce";
import { cn } from "@/lib/utils";

// ── Date Preset ────────────────────────────────────────────────────────────────
type DatePreset = "all" | "today" | "this_week" | "this_month" | "this_year" | "last_year" | "custom";

const getPresetRange = (preset: DatePreset): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (preset === "today")      { const t = fmt(now); return { dateFrom: t, dateTo: t }; }
    if (preset === "this_week")  { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return { dateFrom: fmt(s), dateTo: fmt(now) }; }
    if (preset === "this_month") return { dateFrom: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: fmt(now) };
    if (preset === "this_year")  return { dateFrom: fmt(new Date(now.getFullYear(), 0, 1)), dateTo: fmt(now) };
    if (preset === "last_year")  return { dateFrom: `${now.getFullYear() - 1}-01-01`, dateTo: `${now.getFullYear() - 1}-12-31` };
    return {};
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, gradient, textColor }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string; textColor: string;
}) => (
    <div className={cn("rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all group", gradient)}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-inner">
            <Icon className={cn("h-5 w-5", textColor)} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1">{label}</p>
            <p className={cn("text-xl font-bold truncate", textColor)}>{value}</p>
            {sub && <p className="text-[11px] mt-0.5 opacity-60">{sub}</p>}
        </div>
    </div>
);

// ── PIE colors ─────────────────────────────────────────────────────────────────
const PIE_COLORS = [
    "hsl(217,91%,60%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)",
    "hsl(262,83%,58%)", "hsl(0,84%,60%)",   "hsl(188,78%,41%)",
];

// ── fetch ──────────────────────────────────────────────────────────────────────
const fetchSummary = async (params: Record<string, string>): Promise<ILenderSummary[]> => {
    const res = await axios.get<ApiResponse<ILenderSummary[]>>("/summary/lenders", {
        params: { page: 1, limit: 200, ...params },
    });
    return res.data.data ?? [];
};

// ══════════════════════════════════════════════════════════════════════════════
type Props = { initialData: ILenderSummary[] | null };

const SummaryClient = ({ initialData }: Props) => {
    const [search, setSearch]         = useState("");
    const [status, setStatus]         = useState("all");
    const [datePreset, setDatePreset] = useState<DatePreset>("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo]     = useState("");
    const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

    const debouncedSearch = useDebounce(search, 400);

    const dateRange = useMemo(() => {
        if (datePreset === "custom") return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
        return getPresetRange(datePreset);
    }, [datePreset, customFrom, customTo]);

    const apiParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (status !== "all")    p.status  = status;
        if (debouncedSearch)     p.search  = debouncedSearch;
        if (dateRange.dateFrom)  p.dateFrom = dateRange.dateFrom;
        if (dateRange.dateTo)    p.dateTo   = dateRange.dateTo;
        return p;
    }, [status, debouncedSearch, dateRange]);

    const isFilterActive = status !== "all" || !!debouncedSearch || datePreset !== "all";
    const clearFilters = () => { setSearch(""); setStatus("all"); setDatePreset("all"); setCustomFrom(""); setCustomTo(""); };

    const { data, isLoading } = useQuery<ILenderSummary[]>({
        queryKey: ["lender-summary", apiParams],
        queryFn:  () => fetchSummary(apiParams),
        initialData: (!apiParams.status && !apiParams.search && !apiParams.dateFrom) ? (initialData ?? undefined) : undefined,
        retry: 0,
    });

    // ── Aggregate stats ────────────────────────────────────────────────────
    const rows          = data ?? [];
    const totalBorrowed = rows.reduce((s, l) => s + l.totalBorrowed,  0);
    const totalRepaid   = rows.reduce((s, l) => s + l.totalRepaid,    0);   // principal only
    const totalProfit   = rows.reduce((s, l) => s + (l.totalProfit ?? 0), 0);
    const totalBalance  = rows.reduce((s, l) => s + l.balancePayable, 0);
    const overallPct    = totalBorrowed > 0 ? (totalRepaid / totalBorrowed) * 100 : 0;
    const activeCount   = rows.filter(l => l.isActive !== false).length;
    const paidOffCount  = rows.filter(l => l.balancePayable <= 0).length;

    // ── Export ─────────────────────────────────────────────────────────────
    const handleExport = async (format: "csv" | "pdf") => {
        setIsExporting(format);
        const tid = toast.loading(`Preparing ${format.toUpperCase()} export…`, { description: "Building summary report" });
        try {
            const res = await axios.get("/summary/export", {
                params: { format, ...apiParams },
                responseType: "blob",
            });
            const url  = URL.createObjectURL(new Blob([res.data], { type: format === "pdf" ? "application/pdf" : "text/csv" }));
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `lender-summary_${new Date().toISOString().slice(0, 10)}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Export ready", { id: tid, description: `Your ${format.toUpperCase()} has been downloaded` });
        } catch {
            toast.error("Export failed", { id: tid });
        } finally {
            setIsExporting(null);
        }
    };

    // ── Pie data ───────────────────────────────────────────────────────────
    const pieData = rows.filter(l => l.totalBorrowed > 0).slice(0, 6)
        .map(l => ({ name: l.name, value: l.totalBorrowed }));

    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold tracking-widest text-primary uppercase">Auto-calculated</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Lender Summary</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Principal repayments reduce balance · Profit payments are tracked separately
                    </p>
                </div>
            </div>

            {/* Stat Cards — 5 cards */}
            {rows.length > 0 && (
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                    <StatCard label="Total Lenders" value={String(rows.length)}
                        sub={`${activeCount} active · ${paidOffCount} fully paid`}
                        icon={Users} gradient="bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20"
                        textColor="text-primary" />
                    <StatCard label="Total Borrowed" value={formatCurrency(totalBorrowed)}
                        sub="Cumulative capital received"
                        icon={TrendingDown} gradient="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20"
                        textColor="text-violet-500" />
                    <StatCard label="Principal Repaid" value={formatCurrency(totalRepaid)}
                        sub={`${overallPct.toFixed(1)}% repayment rate`}
                        icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20"
                        textColor="text-emerald-500" />
                    <StatCard label="Profit Paid" value={formatCurrency(totalProfit)}
                        sub="Interest payments (no balance effect)"
                        icon={IndianRupee} gradient="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20"
                        textColor="text-amber-500" />
                    <StatCard label="Outstanding Balance" value={formatCurrency(totalBalance)}
                        sub={`${paidOffCount} fully paid off`}
                        icon={totalBalance > 0 ? AlertCircle : CheckCircle2}
                        gradient={totalBalance > 0
                            ? "bg-gradient-to-br from-red-500/10 to-rose-600/10 border border-red-500/20"
                            : "bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20"}
                        textColor={totalBalance > 0 ? "text-red-500" : "text-emerald-500"} />
                </div>
            )}

            {/* Principal vs Profit breakdown hint */}
            {rows.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            💰 Principal: <strong>{formatCurrency(totalRepaid)}</strong> — reduces lender balance
                        </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-300 font-medium">
                            📈 Profit: <strong>{formatCurrency(totalProfit)}</strong> — interest paid, balance unchanged
                        </span>
                    </div>
                </div>
            )}

            {/* Filters + Export */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-52">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search by name or phone…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 bg-muted/50 border-border h-10" />
                    </div>

                    {/* Status */}
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-36 bg-muted/50 border-border h-10">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Date preset */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                        <Calendar className="h-3.5 w-3.5" /><span className="font-medium">Date:</span>
                    </div>
                    <Select value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)}>
                        <SelectTrigger className="h-10 w-44 bg-muted/50 border-border">
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
                            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                className="h-10 w-40 bg-muted/50 border-border text-sm" />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                className="h-10 w-40 bg-muted/50 border-border text-sm" />
                        </div>
                    )}

                    {/* Export */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-border hover:bg-muted h-10 ml-auto" disabled={!!isExporting}>
                                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download size={16} className="mr-2" />}
                                Export <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Summary Report</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                                <div><p className="text-sm font-medium">Export CSV</p><p className="text-[10px] text-muted-foreground">Includes Principal + Profit columns</p></div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2 cursor-pointer">
                                <FileText className="h-4 w-4 text-red-500" />
                                <div><p className="text-sm font-medium">Export PDF</p><p className="text-[10px] text-muted-foreground">Formatted report</p></div>
                            </DropdownMenuItem>
                            {isFilterActive && (<><DropdownMenuSeparator /><p className="px-2 py-1 text-[10px] text-primary">✦ Exports respect active filters</p></>)}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Active filter banner */}
                {isFilterActive && (
                    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                            <span className="font-medium">Filters active</span>
                            <span className="text-muted-foreground">— stats, chart and export reflect the selected period</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearFilters}
                            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Chart + Table layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie chart */}
                <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <IndianRupee className="h-4 w-4 text-primary" />
                        <p className="text-base font-semibold text-foreground">Investment Share by Lender</p>
                    </div>
                    {pieData.length === 0 ? (
                        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip
                                    formatter={((value: number) => formatCurrency(value)) as unknown as undefined}
                                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Table — spans 2 cols */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
                    {isLoading && !data ? (
                        <div className="p-4"><TableSkeleton rows={5} /></div>
                    ) : (
                        <>
                            {/* Mobile cards */}
                            <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                                {rows.map(lender => (
                                    <div key={lender._id} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden">
                                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary/50 to-primary" />
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="font-bold text-foreground group-hover:text-primary transition-colors">{lender.name}</p>
                                            <StatusBadge status={lender.isActive ? "active" : "inactive"} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Borrowed</p>
                                                <CurrencyDisplay amount={lender.totalBorrowed} />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Principal Repaid</p>
                                                <CurrencyDisplay amount={lender.totalRepaid} variant="success" />
                                            </div>
                                        </div>
                                        {/* Profit row */}
                                        {(lender.totalProfit ?? 0) > 0 && (
                                            <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">📈 Profit Paid</span>
                                                <CurrencyDisplay amount={lender.totalProfit} />
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground font-medium">Balance</span>
                                                <CurrencyDisplay amount={lender.balancePayable} variant={lender.balancePayable > 0 ? "warning" : "success"} className="font-bold" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Progress value={Math.min(lender.repaymentPercentage, 100)} className="h-1.5 flex-1" />
                                                <span className={cn("text-[10px] font-bold", lender.repaymentPercentage >= 100 ? "text-emerald-500" : lender.repaymentPercentage >= 50 ? "text-amber-500" : "text-destructive")}>
                                                    {lender.repaymentPercentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-10 text-center">#</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lender</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Borrowed</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                                                <span className="text-emerald-600 dark:text-emerald-400">💰 Principal</span>
                                            </TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                                                <span className="text-amber-600 dark:text-amber-400">📈 Profit</span>
                                            </TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Balance</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-40">Repayment %</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">
                                                    No lenders match the selected filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : rows.map((lender, index) => (
                                            <TableRow key={lender._id} className="border-border hover:bg-muted/50 transition-colors">
                                                <TableCell className="text-center text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">{lender.name}</div>
                                                    {lender.phone && <div className="text-xs text-muted-foreground">{lender.phone}</div>}
                                                </TableCell>
                                                <TableCell className="text-right"><CurrencyDisplay amount={lender.totalBorrowed} variant="primary" /></TableCell>
                                                {/* Principal */}
                                                <TableCell className="text-right">
                                                    <CurrencyDisplay amount={lender.totalRepaid} variant="success" />
                                                </TableCell>
                                                {/* Profit */}
                                                <TableCell className="text-right">
                                                    {(lender.totalProfit ?? 0) > 0 ? (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 font-semibold text-amber-600 border-amber-500/30 bg-amber-500/10 dark:text-amber-400">
                                                            {formatCurrency(lender.totalProfit)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <CurrencyDisplay amount={lender.balancePayable} variant={lender.balancePayable > 0 ? "warning" : "success"} className="font-bold" />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={Math.min(lender.repaymentPercentage, 100)} className="h-1.5 flex-1" />
                                                        <span className={cn("text-xs font-medium tabular-nums min-w-[3rem] text-right",
                                                            lender.repaymentPercentage >= 100 ? "text-emerald-500" : lender.repaymentPercentage >= 50 ? "text-amber-500" : "text-destructive"
                                                        )}>
                                                            {lender.repaymentPercentage.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell><StatusBadge status={lender.isActive ? "active" : "inactive"} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Footer totals */}
                                {rows.length > 0 && (
                                    <div className="border-t border-border bg-muted/20 px-4 py-3 grid grid-cols-8 gap-2 items-center text-xs">
                                        <div className="col-span-2 font-bold text-muted-foreground uppercase tracking-wider">{rows.length} lenders</div>
                                        <div className="text-right font-bold text-primary">{formatCurrency(totalBorrowed)}</div>
                                        <div className="text-right font-bold text-emerald-500">{formatCurrency(totalRepaid)}</div>
                                        <div className="text-right font-bold text-amber-500">{formatCurrency(totalProfit)}</div>
                                        <div className="text-right font-bold text-red-500">{formatCurrency(totalBalance)}</div>
                                        <div className="col-span-2 text-right text-muted-foreground">{overallPct.toFixed(1)}% avg</div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default SummaryClient;
