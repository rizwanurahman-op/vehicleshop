"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useRouter } from "next/navigation";
import { getClientSession } from "@/lib/auth";
import { formatINR, formatINRCompact } from "@lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Users, Search, Eye, Edit, ToggleLeft, RotateCcw,
    Download, FileText, FileSpreadsheet, ChevronDown, Loader2, X, Calendar,
    IndianRupee, TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateLenderDialog, DeleteLenderDialog, UpdateLenderDialog } from ".";
import { EmptyState, TableSkeleton, StatusBadge, CurrencyDisplay, AdminOnly } from "@components/shared";
import { useDebounce } from "@hooks/use-debounce";

// ── Adaptive font size for stat card values ──────────────────────────────────
const statSizeClass = (val: string): string => {
    const len = val.length;
    if (len <= 5)  return "text-2xl";
    if (len <= 8)  return "text-xl";
    if (len <= 11) return "text-lg";
    if (len <= 14) return "text-base";
    return "text-sm";
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, gradient, textColor }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string; textColor: string;
}) => {
    const sizeClass = statSizeClass(value);
    return (
        <div className={cn("relative rounded-2xl p-5 pr-16 shadow-sm hover:shadow-md transition-all group overflow-hidden", gradient)}>
            {/* Icon absolutely positioned top-right */}
            <div className="absolute top-4 right-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-inner">
                <Icon className={cn("h-5 w-5", textColor)} />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1">{label}</p>
            <p
                title={value}
                className={cn("font-mono font-bold tabular-nums whitespace-nowrap overflow-hidden leading-tight", sizeClass, textColor)}
            >
                {value}
            </p>
            {sub && <p className="text-[11px] mt-1 opacity-60">{sub}</p>}
        </div>
    );
};

// ── Date Preset ───────────────────────────────────────────────────────────────
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

const fetchLenders = async (search: string, status: string): Promise<ILenderWithSummary[]> => {
    const res = await axios.get<ApiResponse<ILenderWithSummary[]>>("/lenders", {
        params: { page: 1, limit: 100, search: search || undefined, status },
    });
    return res.data.data ?? [];
};

interface LenderStats {
    totalLenders: number; totalBorrowed: number; totalRepaid: number;
    totalProfit: number;
    balancePayable: number; activeCount: number; inactiveCount: number; paidOffCount: number;
}

type LenderListProps = { initialData: ILenderWithSummary[] | null };

const LenderList = ({ initialData }: LenderListProps) => {
    const router = useRouter();
    const [search, setSearch]             = useState("");
    const [status, setStatus]             = useState("all");
    const [datePreset, setDatePreset]     = useState<DatePreset>("all");
    const [customFrom, setCustomFrom]     = useState("");
    const [customTo, setCustomTo]         = useState("");
    const [editLender, setEditLender]     = useState<ILenderWithSummary | null>(null);
    const [deleteLender, setDeleteLender] = useState<ILenderWithSummary | null>(null);
    const [isExporting, setIsExporting]   = useState<"csv" | "pdf" | null>(null);
    // Prevents residual pointer events from the closing dialog overlay triggering row navigation
    const dialogClosingRef = useRef(false);
    const markDialogClosing = () => {
        dialogClosingRef.current = true;
        setTimeout(() => { dialogClosingRef.current = false; }, 300);
    };
    const navigateTo = (href: string) => {
        if (!dialogClosingRef.current) router.push(href);
    };

    const debouncedSearch = useDebounce(search, 400);

    const dateRange = useMemo(() => {
        if (datePreset === "custom") return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
        return getPresetRange(datePreset);
    }, [datePreset, customFrom, customTo]);

    const isFilterActive  = status !== "all" || !!debouncedSearch || datePreset !== "all";

    const apiParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (status !== "all")  p.status = status;
        if (debouncedSearch)   p.search = debouncedSearch;
        if (dateRange.dateFrom) p.dateFrom = dateRange.dateFrom;
        if (dateRange.dateTo)   p.dateTo   = dateRange.dateTo;
        return p;
    }, [status, debouncedSearch, dateRange]);

    const clearFilters = () => { setSearch(""); setStatus("all"); setDatePreset("all"); setCustomFrom(""); setCustomTo(""); };

    const { data, isLoading } = useQuery<ILenderWithSummary[]>({
        queryKey: ["lenders", debouncedSearch, status],
        queryFn: () => fetchLenders(debouncedSearch, status),
        initialData: initialData ?? undefined,
        retry: 0,
    });

    const statsQuery = useQuery<ApiResponse<LenderStats>>({
        queryKey: ["lender-stats", apiParams],
        queryFn: () => axios.get<ApiResponse<LenderStats>>("/lenders/stats", { params: apiParams }).then(r => r.data),
    });
    const stats = statsQuery.data?.data;

    const handleExport = async (format: "csv" | "pdf") => {
        setIsExporting(format);
        const tid = toast.loading(`Preparing ${format.toUpperCase()} export…`, { description: "Building lenders report" });
        try {
            const p = new URLSearchParams({ format, ...apiParams });
            const baseURL = (axios.defaults.baseURL ?? "").replace(/\/$/, "");
            const url = `${baseURL}/lenders/export?${p.toString()}`;
            const token = getClientSession();
            const res = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            const fileName = `lenders_${new Date().toISOString().slice(0, 10)}.${format}`;
            link.download = fileName;
            document.body.appendChild(link); link.click(); link.remove();
            URL.revokeObjectURL(link.href);
            toast.success(`${format.toUpperCase()} downloaded!`, { id: tid, description: `${fileName} saved` });
        } catch {
            toast.error("Export failed", { id: tid, description: "Could not generate the report." });
        } finally { setIsExporting(null); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-md">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Lenders</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground ml-11">Manage investor relationships and track capital</p>
                </div>
                <AdminOnly>
                    <CreateLenderDialog />
                </AdminOnly>
            </div>

            {/* Stats Cards */}
            {stats && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        <StatCard label="Total Lenders"     value={String(stats.totalLenders)}
                            sub={`${stats.activeCount} active · ${stats.paidOffCount} paid off`}
                            icon={Users} gradient="bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20"
                            textColor="text-primary" />
                        <StatCard label="Total Borrowed"    value={formatINR(stats.totalBorrowed)}
                            sub="Capital received" icon={TrendingDown}
                            gradient="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20"
                            textColor="text-violet-500" />
                        <StatCard label="💰 Principal Repaid" value={formatINR(stats.totalRepaid)}
                            sub="Reduces balance" icon={TrendingUp}
                            gradient="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20"
                            textColor="text-emerald-500" />
                        <StatCard label="📈 Profit Paid"     value={formatINR(stats.totalProfit ?? 0)}
                            sub="Interest · balance unchanged" icon={IndianRupee}
                            gradient="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20"
                            textColor="text-amber-500" />
                        <StatCard label="Balance Payable"   value={formatINR(stats.balancePayable)}
                            sub={`${stats.paidOffCount} fully paid off`}
                            icon={stats.balancePayable > 0 ? AlertCircle : CheckCircle2}
                            gradient={stats.balancePayable > 0
                                ? "bg-gradient-to-br from-red-500/10 to-rose-600/10 border border-red-500/20"
                                : "bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20"}
                            textColor={stats.balancePayable > 0 ? "text-red-500" : "text-emerald-500"} />
                    </div>
                    {/* Principal vs Profit breakdown hint */}
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                💰 Principal: <strong>{formatINR(stats.totalRepaid)}</strong> — reduces lender balance
                            </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-amber-700 dark:text-amber-300 font-medium">
                                📈 Profit: <strong>{formatINR(stats.totalProfit ?? 0)}</strong> — interest paid, balance unchanged
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* Filters + Export */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-52">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50 border-border h-10" />
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
                            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-10 w-40 bg-muted/50 border-border text-sm" />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-10 w-40 bg-muted/50 border-border text-sm" />
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
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Lenders Report</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                                <div><p className="text-sm font-medium">Export CSV</p><p className="text-[10px] text-muted-foreground">Excel compatible</p></div>
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
                            <span className="text-muted-foreground">— stats and exports are filtered</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearFilters}
                            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading && !data ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : !data || data.length === 0 ? (
                    <EmptyState icon={Users} title="No lenders yet" description="Add your first investor to start tracking capital and repayments." action={<AdminOnly><CreateLenderDialog /></AdminOnly>} />
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                            {data.map(lender => (
                                <div key={lender._id} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden cursor-pointer" onClick={() => navigateTo(`/lenders/${lender._id}`)}>
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary/50 to-primary" />
                                    <div className="relative flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0"><Users className="h-4 w-4 text-primary" /></div>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Lender</p>
                                        </div>
                                        <StatusBadge status={lender.isActive ? "active" : "inactive"} />
                                    </div>
                                    <div className="relative mb-5">
                                        <p className="text-lg font-bold text-foreground tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{lender.name}</p>
                                        {lender.phone && <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{lender.phone}</span>}
                                    </div>
                                    <div className="relative mt-auto pt-4 border-t border-border/60 border-dashed">
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Borrowed</p>
                                                <p className="font-bold text-foreground tabular-nums leading-none"><CurrencyDisplay amount={lender.totalBorrowed} /></p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">💰 Principal</p>
                                                <p className="font-bold text-emerald-500 tabular-nums leading-none"><CurrencyDisplay amount={lender.totalRepaid} /></p>
                                            </div>
                                        </div>
                                        {(lender.totalProfit ?? 0) > 0 && (
                                            <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">📈 Profit Paid</span>
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatINR(lender.totalProfit)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <span className="text-xs font-semibold text-muted-foreground">Balance</span>
                                            <span className="font-bold tabular-nums"><CurrencyDisplay amount={lender.balancePayable} variant={lender.balancePayable > 0 ? "warning" : "success"} /></span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 flex items-center justify-end gap-2 border-t border-border/60 border-dashed" onClick={e => e.stopPropagation()}>
                                        <AdminOnly>
                                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-muted/30" onClick={() => setEditLender(lender)}><Edit size={14} className="mr-1.5" />Edit</Button>
                                            {lender.isActive ? (
                                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 bg-muted/30" onClick={() => setDeleteLender(lender)}>
                                                    <ToggleLeft size={14} className="mr-1.5" />Deactivate
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 bg-muted/30" onClick={() => setDeleteLender(lender)}>
                                                    <RotateCcw size={14} className="mr-1.5" />Restore / Delete
                                                </Button>
                                            )}
                                        </AdminOnly>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">#</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Name</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Borrowed</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                                            <span className="text-emerald-600 dark:text-emerald-400">💰 Principal</span>
                                        </TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                                            <span className="text-amber-600 dark:text-amber-400">📈 Profit</span>
                                        </TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Balance</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((lender, index) => (
                                        <TableRow key={lender._id} className="border-border hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigateTo(`/lenders/${lender._id}`)}>
                                            <TableCell className="text-center text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-foreground">{lender.name}</div>
                                                {lender.phone && <div className="text-xs text-muted-foreground">{lender.phone}</div>}
                                            </TableCell>
                                            <TableCell className="text-right"><CurrencyDisplay amount={lender.totalBorrowed} variant="primary" /></TableCell>
                                            <TableCell className="text-right"><CurrencyDisplay amount={lender.totalRepaid} variant="success" /></TableCell>
                                            <TableCell className="text-right">
                                                {(lender.totalProfit ?? 0) > 0
                                                    ? <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{formatINR(lender.totalProfit)}</span>
                                                    : <span className="text-xs text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right"><CurrencyDisplay amount={lender.balancePayable} variant={lender.balancePayable > 0 ? "warning" : "success"} className="font-bold" /></TableCell>
                                            <TableCell><StatusBadge status={lender.isActive ? "active" : "inactive"} /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="View details" onClick={() => navigateTo(`/lenders/${lender._id}`)}><Eye size={14} /></Button>
                                                    <AdminOnly>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit" onClick={() => setEditLender(lender)}><Edit size={14} /></Button>
                                                        {lender.isActive ? (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Deactivate" onClick={() => setDeleteLender(lender)}><ToggleLeft size={14} /></Button>
                                                        ) : (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-500" title="Restore or permanently delete" onClick={() => setDeleteLender(lender)}><RotateCcw size={14} /></Button>
                                                        )}
                                                    </AdminOnly>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            {editLender   && <UpdateLenderDialog lender={editLender}   open={!!editLender}   onOpenChange={open => { if (!open) { markDialogClosing(); setEditLender(null); } }} />}
            {deleteLender && <DeleteLenderDialog lender={deleteLender} open={!!deleteLender} onOpenChange={open => { if (!open) { markDialogClosing(); setDeleteLender(null); } }} />}
        </div>
    );
};

export default LenderList;
