"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { getClientSession } from "@/lib/auth";
import { formatCurrency } from "@lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    ArrowUpRight, Search, Edit, Trash2,
    Download, FileText, FileSpreadsheet, ChevronDown, Loader2, Calendar, X,
    BarChart3, CreditCard, TrendingDown, TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateRepaymentDialog, UpdateRepaymentDialog, DeleteRepaymentDialog } from ".";
import { EmptyState, TableSkeleton, CurrencyDisplay, DateDisplay, AdminOnly } from "@components/shared";
import { useDebounce } from "@hooks/use-debounce";
import { PAYMENT_MODES } from "@data";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RepaymentStats {
    totalRepayments: number;
    totalPaid: number;
    totalPrincipal: number;
    totalProfit: number;
    avgAmount: number;
    byMode: Record<string, number>;
    uniqueLenders: number;
}

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

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, gradient, textColor }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string; textColor: string;
}) => (
    <div className={cn("rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all", gradient)}>
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

const fetchRepayments = async (params: Record<string, string>): Promise<IRepayment[]> => {
    const res = await axios.get<ApiResponse<IRepayment[]>>("/repayments", {
        params: { page: 1, limit: 200, ...params },
    });
    return res.data.data ?? [];
};

type RepaymentListProps = { initialData: IRepayment[] | null };

const RepaymentList = ({ initialData }: RepaymentListProps) => {
    const [search, setSearch]               = useState("");
    const [mode, setMode]                   = useState("all");
    const [repaymentType, setRepaymentType] = useState("all");
    const [datePreset, setDatePreset]       = useState<DatePreset>("all");
    const [customFrom, setCustomFrom]       = useState("");
    const [customTo, setCustomTo]           = useState("");
    const [editItem, setEditItem]           = useState<IRepayment | null>(null);
    const [deleteItem, setDeleteItem]       = useState<IRepayment | null>(null);
    const [isExporting, setIsExporting]     = useState<"csv" | "pdf" | null>(null);

    const debouncedSearch = useDebounce(search, 400);

    const dateRange = useMemo(() => {
        if (datePreset === "custom") return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
        return getPresetRange(datePreset);
    }, [datePreset, customFrom, customTo]);

    const apiParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (mode !== "all")          p.mode          = mode;
        if (repaymentType !== "all") p.repaymentType = repaymentType;
        if (dateRange.dateFrom)     p.dateFrom      = dateRange.dateFrom;
        if (dateRange.dateTo)       p.dateTo        = dateRange.dateTo;
        return p;
    }, [mode, repaymentType, dateRange]);

    const isFilterActive = mode !== "all" || repaymentType !== "all" || datePreset !== "all" || !!debouncedSearch;

    const clearFilters = () => { setSearch(""); setMode("all"); setRepaymentType("all"); setDatePreset("all"); setCustomFrom(""); setCustomTo(""); };

    const { data, isLoading } = useQuery<IRepayment[]>({
        queryKey: ["repayments", apiParams, debouncedSearch],
        queryFn: () => fetchRepayments(apiParams),
        initialData: (!Object.keys(apiParams).length ? initialData : undefined) ?? undefined,
        retry: 0,
    });

    // Client-side search filter
    const filtered = useMemo(() => (data ?? []).filter(r => {
        if (!debouncedSearch) return true;
        const lender = r.lender as ILender;
        return (
            r.repaymentId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            lender?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }), [data, debouncedSearch]);

    const statsQuery = useQuery<ApiResponse<RepaymentStats>>({
        queryKey: ["repayment-stats", apiParams],
        queryFn: () => axios.get<ApiResponse<RepaymentStats>>("/repayments/stats", { params: apiParams }).then(r => r.data),
    });
    const stats = statsQuery.data?.data;
    const topMode = stats ? Object.entries(stats.byMode).sort((a, b) => b[1] - a[1])[0] : null;

    const handleExport = async (format: "csv" | "pdf") => {
        setIsExporting(format);
        const tid = toast.loading(`Preparing ${format.toUpperCase()} export…`, { description: "Building repayments report" });
        try {
            const p = new URLSearchParams({ format, ...apiParams });
            const baseURL = (axios.defaults.baseURL ?? "").replace(/\/$/, "");
            const url = `${baseURL}/repayments/export?${p.toString()}`;
            const token = getClientSession();
            const res = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            const fileName = `repayments_${new Date().toISOString().slice(0, 10)}.${format}`;
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                            <ArrowUpRight className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Repayments</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground ml-11">All money paid back to lenders</p>
                </div>
                <AdminOnly>
                    <CreateRepaymentDialog />
                </AdminOnly>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Total Repayments" value={String(stats.totalRepayments)}
                        sub={`To ${stats.uniqueLenders} lenders`} icon={BarChart3}
                        gradient="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20"
                        textColor="text-emerald-500" />
                    <StatCard label="Principal Repaid" value={formatCurrency(stats.totalPrincipal ?? stats.totalPaid)}
                        sub="Reduces balance" icon={TrendingDown}
                        gradient="bg-gradient-to-br from-primary/10 to-indigo-600/10 border border-primary/20"
                        textColor="text-primary" />
                    <StatCard label="Profit Paid" value={formatCurrency(stats.totalProfit ?? 0)}
                        sub="Interest payments" icon={TrendingUp}
                        gradient="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20"
                        textColor="text-amber-500" />
                    <StatCard label="Top Mode" value={topMode?.[0] ?? "—"}
                        sub={topMode ? `${formatCurrency(topMode[1])} via this mode` : "No data"} icon={CreditCard}
                        gradient="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20"
                        textColor="text-violet-500" />
                </div>
            )}

            {/* Filters + Export */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-52">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search repayments…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50 h-10" />
                    </div>

                    {/* Mode filter */}
                    <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger className="w-36 bg-muted/50 h-10">
                            <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Modes</SelectItem>
                            {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Type filter */}
                    <Select value={repaymentType} onValueChange={setRepaymentType}>
                        <SelectTrigger className="w-36 bg-muted/50 h-10">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Principal">Principal</SelectItem>
                            <SelectItem value="Profit">Profit</SelectItem>
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
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Repayments Report</DropdownMenuLabel>
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
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading && !data ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={ArrowUpRight} title="No repayments found"
                        description={isFilterActive ? "Try adjusting your filters." : "Record a repayment to a lender."}
                        action={<AdminOnly><CreateRepaymentDialog /></AdminOnly>} />
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                            {filtered.map((rep) => {
                                const lender = rep.lender as ILender;
                                return (
                                    <div key={rep._id} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all overflow-hidden">
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0"><ArrowUpRight className="h-4 w-4 text-emerald-500" /></div>
                                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Repayment</p>
                                            </div>
                                            <DateDisplay date={rep.date} className="text-xs font-semibold text-foreground" />
                                        </div>
                                        <div className="relative mb-5">
                                            <p className="text-lg font-bold text-foreground tracking-tight leading-none mb-1.5">{lender?.name || "—"}</p>
                                        </div>
                                        <div className="relative mt-auto pt-4 border-t border-border/60 border-dashed">
                                            <div className="flex items-end justify-between mb-3">
                                                <div className="space-y-1.5">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] px-1.5 py-0 font-semibold border",
                                                        rep.repaymentType === "Profit"
                                                            ? "text-amber-600 border-amber-500/40 bg-amber-500/10 dark:text-amber-400"
                                                            : "text-emerald-600 border-emerald-500/40 bg-emerald-500/10 dark:text-emerald-400"
                                                    )}>
                                                        {rep.repaymentType === "Profit" ? "📈 Profit" : "💰 Principal"}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 block">{rep.mode}</Badge>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Amount Paid</p>
                                                    <p className="text-xl font-bold text-emerald-500 tabular-nums leading-none"><CurrencyDisplay amount={rep.amountPaid} /></p>
                                                </div>
                                            </div>
                                            {rep.remarks && <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg line-clamp-2 mt-2">{rep.remarks}</p>}
                                        </div>
                                        <div className="mt-4 pt-3 flex items-center justify-end gap-2 border-t border-border/60 border-dashed">
                                            <AdminOnly>
                                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-muted/30" onClick={() => setEditItem(rep)}><Edit size={14} className="mr-1.5" />Edit</Button>
                                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 bg-muted/30" onClick={() => setDeleteItem(rep)}><Trash2 size={14} className="mr-1.5" />Delete</Button>
                                            </AdminOnly>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">#</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lender</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Type</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Amount Paid</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Mode</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Remarks</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((rep, index) => {
                                        const lender = rep.lender as ILender;
                                        return (
                                            <TableRow key={rep._id} className="border-border hover:bg-muted/50 transition-colors group">
                                                <TableCell className="text-center text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                                                <TableCell><DateDisplay date={rep.date} className="text-muted-foreground" /></TableCell>
                                                <TableCell><div className="font-medium">{lender?.name || "—"}</div></TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] px-1.5 py-0 font-semibold border",
                                                        rep.repaymentType === "Profit"
                                                            ? "text-amber-600 border-amber-500/40 bg-amber-500/10 dark:text-amber-400"
                                                            : "text-emerald-600 border-emerald-500/40 bg-emerald-500/10 dark:text-emerald-400"
                                                    )}>
                                                        {rep.repaymentType === "Profit" ? "📈 Profit" : "💰 Principal"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right"><CurrencyDisplay amount={rep.amountPaid} variant="success" /></TableCell>
                                                <TableCell><Badge variant="outline" className="text-[11px]">{rep.mode}</Badge></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">{rep.remarks || "—"}</span></TableCell>
                                                <TableCell className="text-right">
                                                    <AdminOnly>
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(rep)}><Edit size={14} /></Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteItem(rep)}><Trash2 size={14} /></Button>
                                                        </div>
                                                    </AdminOnly>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            {editItem   && <UpdateRepaymentDialog repayment={editItem}  open={!!editItem}   onOpenChange={open => !open && setEditItem(null)} />}
            {deleteItem && <DeleteRepaymentDialog repayment={deleteItem} open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)} />}
        </div>
    );
};

export default RepaymentList;
