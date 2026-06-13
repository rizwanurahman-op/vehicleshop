"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@lib/currency";
import { cn } from "@/lib/utils";
import {
    Phone, MapPin, FileText, Calendar,
    TrendingDown, TrendingUp, AlertCircle, CheckCircle2,
    ArrowLeft, Edit, ToggleLeft, RotateCcw, Plus,
    CreditCard, Hash, StickyNote, Loader2,
    IndianRupee, BarChart3, Trash2,
    Download, FileDown, Sheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminOnly, CurrencyDisplay, TableSkeleton } from "@components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpdateLenderDialog } from "../../components";
import { DeleteLenderDialog } from "../../components";
import { AddInvestmentDialog } from "./add-investment-dialog";
import { AddRepaymentDialog } from "./add-repayment-dialog";
import { useMutation } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface IInvestmentRow {
    _id: string;
    investmentId: string;
    date: string;
    amountReceived: number;
    mode: string;
    referenceNo?: string;
    notes?: string;
}

interface IRepaymentRow {
    _id: string;
    repaymentId: string;
    date: string;
    amountPaid: number;
    mode: string;
    repaymentType?: "Principal" | "Profit";
    referenceNo?: string;
    remarks?: string;
}

type Tab = "investments" | "repayments";

interface DeleteTarget {
    _id: string;
    id: string;       // human-readable ID (investmentId / repaymentId)
    type: "investment" | "repayment";
    amount: number;
    date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (s?: string) =>
    s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ModeBadge = ({ mode }: { mode?: string }) => {
    const map: Record<string, string> = {
        Cash: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Online: "bg-sky-500/10 text-sky-500 border-sky-500/20",
        UPI: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        Cheque: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    };
    return (
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", map[mode ?? ""] ?? "bg-muted text-muted-foreground border-border")}>
            <CreditCard className="h-2.5 w-2.5" /> {mode ?? "—"}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, gradient, textColor }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string; textColor: string;
}) => (
    <div className={cn("rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center sm:items-start gap-2.5 sm:gap-4 shadow-sm hover:shadow-md transition-all min-w-0", gradient)}>
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-sm shadow-inner">
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", textColor)} />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold opacity-70 mb-0.5 truncate">{label}</p>
            <p className={cn("text-sm sm:text-xl font-bold truncate", textColor)}>{value}</p>
            {sub && <p className="text-[10px] sm:text-[11px] mt-0.5 opacity-60 truncate">{sub}</p>}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar = ({ pct }: { pct: number }) => {
    const safe = Math.min(100, Math.max(0, pct));
    const color = safe >= 100 ? "bg-emerald-500" : safe >= 60 ? "bg-sky-500" : safe >= 30 ? "bg-amber-500" : "bg-red-500";
    const textColor = safe >= 100 ? "text-emerald-500" : safe >= 60 ? "text-sky-500" : safe >= 30 ? "text-amber-500" : "text-red-500";
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Repayment Progress</span>
                <span className={cn("font-bold tabular-nums text-base", textColor)}>{safe.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${safe}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>₹0</span>
                <span>{safe >= 100 ? "Fully Repaid 🎉" : "Outstanding"}</span>
            </div>
        </div>
    );
};

// ───────────────────────────────────────────────────────────────────────────────
// Confirm Delete Dialog
// ───────────────────────────────────────────────────────────────────────────────
function ConfirmDeleteDialog({
    target, onConfirm, onCancel, isPending,
}: {
    target: DeleteTarget;
    onConfirm: () => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const isInv = target.type === "investment";
    return (
        <Dialog open onOpenChange={open => { if (!open) onCancel(); }}>
            <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden rounded-2xl border-border bg-card">
                {/* Header */}
                <div className="bg-destructive/10 border-b border-destructive/20 p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/20">
                        <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <DialogTitle className="text-base font-bold text-foreground">
                            Delete {isInv ? "Investment" : "Repayment"}?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            This action cannot be undone.
                        </DialogDescription>
                    </div>
                </div>
                {/* Body */}
                <div className="p-5 space-y-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">{isInv ? "Investment" : "Repayment"} ID</span>
                            <span className="font-mono font-bold text-foreground">{target.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Amount</span>
                            <span className="font-bold text-destructive">{formatCurrency(target.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Date</span>
                            <span className="text-foreground">{fmtDate(target.date)}</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Deleting this record will permanently remove it and update the lender&apos;s balance accordingly.
                    </p>
                </div>
                {/* Footer */}
                <div className="border-t border-border bg-muted/30 p-4 flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending} className="h-9">
                        Cancel
                    </Button>
                    <Button
                        variant="destructive" size="sm"
                        onClick={onConfirm}
                        disabled={isPending}
                        className="h-9 gap-1.5"
                    >
                        {isPending
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                            : <><Trash2 className="h-3.5 w-3.5" /> Delete Permanently</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Info field
// ─────────────────────────────────────────────────────────────────────────────
const InfoField = ({ icon: Icon, label, value, mono = false }: {
    icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null; mono?: boolean;
}) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                <p className={cn("text-sm font-medium text-foreground break-words leading-snug", mono && "font-mono")}>{value}</p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
interface LenderDetailProps {
    id: string;
    initialData: ILenderWithSummary | null;
}

export function LenderDetail({ id, initialData }: LenderDetailProps) {
    const router = useRouter();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>("investments");
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [addInvOpen, setAddInvOpen] = useState(false);
    const [addRepOpen, setAddRepOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [exportingFormat, setExportingFormat] = useState<string | null>(null);

    // ── Download helper ─────────────────────────────────────────────────────
    const downloadFile = async (format: string) => {
        setExportingFormat(format);
        try {
            const res = await axios.get(`/lenders/${id}/statement`, {
                params: { format },
                responseType: "blob",
            });
            const mime   = res.headers["content-type"] ?? "application/octet-stream";
            const cd     = res.headers["content-disposition"] ?? "";
            const match  = cd.match(/filename="?([^"]+)"?/);
            const fname  = match?.[1] ?? `lender_export_${format}.${format === "pdf" ? "pdf" : "csv"}`;
            const url    = URL.createObjectURL(new Blob([res.data], { type: mime }));
            const a      = document.createElement("a");
            a.href       = url;
            a.download   = fname;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Download ready", { description: fname });
        } catch {
            toast.error("Export failed", { description: "Could not generate the export. Try again." });
        } finally {
            setExportingFormat(null);
        }
    };

    // ── Invalidate all lender-related queries ───────────────────────────
    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: ["lender", id] });
        qc.invalidateQueries({ queryKey: ["lender-investments", id] });
        qc.invalidateQueries({ queryKey: ["lender-repayments", id] });
        qc.invalidateQueries({ queryKey: ["lender-stats"] });
        qc.invalidateQueries({ queryKey: ["lenders"] });          // ← refresh list page
        qc.invalidateQueries({ queryKey: ["investments"] });
        qc.invalidateQueries({ queryKey: ["repayments"] });
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };

    // ── Delete mutations ───────────────────────────────────────────
    const { mutate: doDelete, isPending: isDeleting } = useMutation({
        mutationFn: async (target: DeleteTarget) => {
            const path = target.type === "investment"
                ? `/investments/${target._id}`
                : `/repayments/${target._id}`;
            await axios.delete(path);
        },
        onSuccess: () => {
            toast.success("Deleted", {
                description: `${deleteTarget?.type === "investment" ? "Investment" : "Repayment"} removed successfully.`,
            });
            setDeleteTarget(null);
            invalidateAll();
        },
        onError: () => {
            toast.error("Delete failed", { description: "Could not delete the record. Please try again." });
        },
    });

    // ── Main lender data ──────────────────────────────────────────────────────
    const { data: lender, isLoading: lenderLoading } = useQuery<ILenderWithSummary>({
        queryKey: ["lender", id],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<ILenderWithSummary>>(`/lenders/${id}`);
            return res.data.data!;
        },
        initialData: initialData ?? undefined,
        retry: 1,
    });

    // ── Investments list ──────────────────────────────────────────────────────
    const { data: investments, isLoading: invLoading } = useQuery<IInvestmentRow[]>({
        queryKey: ["lender-investments", id],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<IInvestmentRow[]>>(`/investments/by-lender/${id}`, {
                params: { limit: 200 },
            });
            return res.data.data ?? [];
        },
        retry: 1,
    });

    // ── Repayments list ───────────────────────────────────────────────────────
    const { data: repayments, isLoading: repLoading } = useQuery<IRepaymentRow[]>({
        queryKey: ["lender-repayments", id],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<IRepaymentRow[]>>(`/repayments/by-lender/${id}`, {
                params: { limit: 200 },
            });
            return res.data.data ?? [];
        },
        retry: 1,
    });

    const pct = lender && lender.totalBorrowed > 0
        ? (lender.totalRepaid / lender.totalBorrowed) * 100
        : 0;
    const isPaidOff = (lender?.balancePayable ?? 1) <= 0;

    if (lenderLoading && !lender) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm font-medium">Loading lender details…</span>
            </div>
        );
    }

    if (!lender) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Lender Not Found</h2>
                <p className="text-sm text-muted-foreground">This lender may have been permanently deleted.</p>
                <Button variant="outline" onClick={() => router.push("/lenders")} className="mt-2">
                    <ArrowLeft size={16} className="mr-2" /> Back to Lenders
                </Button>
            </div>
        );
    }

    const initial = lender.name?.charAt(0)?.toUpperCase() ?? "L";

    return (
        <div className="space-y-6 p-0">
            {/* ── Back + Actions ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push("/lenders")} className="gap-2 text-muted-foreground hover:text-foreground -ml-1 shrink-0">
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Lenders</span>
                </Button>
                <div className="flex items-center gap-2 shrink-0">
                    {/* ── Export dropdown (available to all users) ──────────── */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline" size="sm"
                                disabled={!!exportingFormat}
                                className="gap-1.5 h-9 text-xs border-violet-500/30 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
                            >
                                {exportingFormat
                                    ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
                                    : <><Download size={14} /> <span className="hidden sm:inline">Export</span></>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Export Lender Data</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => downloadFile("pdf")}
                                disabled={!!exportingFormat}
                            >
                                <FileDown size={14} className="text-violet-500" />
                                <span>Statement PDF</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">Full report</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => downloadFile("investments-csv")}
                                disabled={!!exportingFormat}
                            >
                                <Sheet size={14} className="text-emerald-500" />
                                <span>Investments CSV</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => downloadFile("repayments-csv")}
                                disabled={!!exportingFormat}
                            >
                                <Sheet size={14} className="text-amber-500" />
                                <span>Repayments CSV</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* ── Admin actions ─────────────────────────────────────── */}
                    <AdminOnly>
                        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 h-9 text-xs">
                            <Edit size={14} /> <span className="hidden sm:inline">Edit</span>
                        </Button>
                        {lender.isActive ? (
                            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
                                <ToggleLeft size={14} /> <span className="hidden sm:inline">Deactivate</span>
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 h-9 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30">
                                <RotateCcw size={14} /> <span className="hidden sm:inline">Restore / Delete</span>
                            </Button>
                        )}
                    </AdminOnly>
                </div>
            </div>

            {/* ── Hero Card ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent p-6">
                <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Avatar */}
                    <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg text-white text-2xl sm:text-3xl font-bold select-none">
                        {initial}
                        <span className={cn(
                            "absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-card shadow",
                            lender.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                        )} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight break-words">{lender.name}</h1>
                            <span className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border",
                                lender.isActive
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20"
                            )}>
                                {lender.isActive
                                    ? <><CheckCircle2 className="h-2.5 w-2.5" /> Active</>
                                    : <><AlertCircle className="h-2.5 w-2.5" /> Inactive</>}
                            </span>
                            {isPaidOff && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Fully Paid
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {lender.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5" /> {lender.phone}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5" /> {(lender as unknown as Record<string, unknown>).lenderId as string ?? "—"}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> Since {fmtDate((lender as unknown as Record<string, unknown>).createdAt as string)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stats ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard
                    label="Total Borrowed" value={formatCurrency(lender.totalBorrowed)}
                    sub={`${investments?.length ?? 0} investment${(investments?.length ?? 0) !== 1 ? "s" : ""}`}
                    icon={TrendingDown}
                    gradient="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20"
                    textColor="text-violet-500"
                />
                <StatCard
                    label="Principal Repaid" value={formatCurrency(lender.totalRepaid)}
                    sub="Reduces balance"
                    icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20"
                    textColor="text-emerald-500"
                />
                <StatCard
                    label="Profit Paid" value={formatCurrency((lender as unknown as Record<string, unknown>).totalProfit as number ?? 0)}
                    sub="Interest payments"
                    icon={IndianRupee}
                    gradient="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20"
                    textColor="text-amber-500"
                />
                <StatCard
                    label="Balance Due" value={formatCurrency(Math.max(0, lender.balancePayable))}
                    sub={isPaidOff ? "Fully settled" : "Outstanding"}
                    icon={isPaidOff ? CheckCircle2 : AlertCircle}
                    gradient={isPaidOff
                        ? "bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20"
                        : "bg-gradient-to-br from-red-500/10 to-rose-600/10 border border-red-500/20"}
                    textColor={isPaidOff ? "text-emerald-500" : "text-red-500"}
                />
                <StatCard
                    label="Repaid %" value={`${pct.toFixed(1)}%`}
                    sub={isPaidOff ? "Complete" : `₹${formatCurrency(Math.max(0, lender.balancePayable))} left`}
                    icon={BarChart3}
                    gradient="bg-gradient-to-br from-sky-500/10 to-cyan-600/10 border border-sky-500/20"
                    textColor="text-sky-500"
                />
            </div>


            {/* ── Progress Bar ──────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-5">
                <ProgressBar pct={pct} />
            </div>

            {/* ── Contact info ──────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact & Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField icon={Phone} label="Phone" value={lender.phone} mono />
                    <InfoField icon={Calendar} label="Joined" value={fmtDate((lender as unknown as Record<string, unknown>).createdAt as string)} />
                    <InfoField icon={Calendar} label="Last Updated" value={fmtDate((lender as unknown as Record<string, unknown>).updatedAt as string)} />
                    <InfoField icon={IndianRupee} label="Lender ID" value={(lender as unknown as Record<string, unknown>).lenderId as string} mono />
                    {lender.address && <div className="sm:col-span-2"><InfoField icon={MapPin} label="Address" value={lender.address} /></div>}
                    {lender.remarks && <div className="sm:col-span-2"><InfoField icon={StickyNote} label="Remarks" value={lender.remarks} /></div>}
                </div>
            </div>

            {/* ── Transaction tabs ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 bg-muted/10">
                    <div className="flex gap-4 overflow-x-auto scrollbar-none -mb-px">
                        <button
                            onClick={() => setActiveTab("investments")}
                            className={cn(
                                "flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-all border-b-2 whitespace-nowrap relative",
                                activeTab === "investments"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <TrendingDown className="h-4 w-4 text-violet-500" />
                            <span>Investments</span>
                            <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full border tabular-nums transition-colors",
                                activeTab === "investments"
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-muted text-muted-foreground border-border"
                            )}>
                                {investments?.length ?? 0}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("repayments")}
                            className={cn(
                                "flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-all border-b-2 whitespace-nowrap relative",
                                activeTab === "repayments"
                                    ? "border-emerald-500 text-emerald-600"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <span>Repayments</span>
                            <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full border tabular-nums transition-colors",
                                activeTab === "repayments"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                            )}>
                                {repayments?.length ?? 0}
                            </span>
                        </button>
                    </div>

                    {/* Per-tab Add button — admin only */}
                    <AdminOnly>
                        <div className="py-2 shrink-0 pl-3 border-l border-border/60 my-2">
                            {activeTab === "investments" ? (
                                <Button
                                    size="sm"
                                    onClick={() => setAddInvOpen(true)}
                                    className="h-8 gap-1.5 text-xs bg-gradient-brand text-white hover:opacity-90 shadow-sm"
                                >
                                    <Plus size={13} /> <span className="hidden sm:inline">Add Investment</span><span className="sm:hidden">Add</span>
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => setAddRepOpen(true)}
                                    className="h-8 gap-1.5 text-xs bg-gradient-success text-white hover:opacity-90 shadow-sm"
                                >
                                    <Plus size={13} /> <span className="hidden sm:inline">Add Repayment</span><span className="sm:hidden">Add</span>
                                </Button>
                            )}
                        </div>
                    </AdminOnly>
                </div>

                {/* Tab content */}
                {activeTab === "investments" && (
                    <TransactionTable
                        type="investment"
                        rows={investments ?? []}
                        isLoading={invLoading}
                        lenderId={id}
                        onDeleteRequest={setDeleteTarget}
                    />
                )}
                {activeTab === "repayments" && (
                    <TransactionTable
                        type="repayment"
                        rows={repayments ?? []}
                        isLoading={repLoading}
                        lenderId={id}
                        onDeleteRequest={setDeleteTarget}
                    />
                )}
            </div>

            {/* ── Dialogs ───────────────────────────────────────────────────── */}
            {editOpen && (
                <UpdateLenderDialog
                    lender={lender}
                    open={editOpen}
                    onOpenChange={(open: boolean) => {
                        setEditOpen(open);
                        if (!open) invalidateAll();
                    }}
                />
            )}
            {deleteOpen && (
                <DeleteLenderDialog
                    lender={lender}
                    open={deleteOpen}
                    onOpenChange={(open: boolean) => {
                        setDeleteOpen(open);
                        if (!open) invalidateAll();
                    }}
                />
            )}
            {addInvOpen && (
                <AddInvestmentDialog
                    lenderId={id}
                    open={addInvOpen}
                    onOpenChange={setAddInvOpen}
                />
            )}
            {addRepOpen && (
                <AddRepaymentDialog
                    lenderId={id}
                    open={addRepOpen}
                    onOpenChange={setAddRepOpen}
                />
            )}
            {/* Delete confirm dialog for investments / repayments */}
            {deleteTarget && (
                <ConfirmDeleteDialog
                    target={deleteTarget}
                    onConfirm={() => doDelete(deleteTarget)}
                    onCancel={() => setDeleteTarget(null)}
                    isPending={isDeleting}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Table (shared for investments & repayments)
// ─────────────────────────────────────────────────────────────────────────────
function TransactionTable({
    type, rows, isLoading, onDeleteRequest,
}: {
    type: "investment" | "repayment";
    rows: (IInvestmentRow | IRepaymentRow)[];
    isLoading: boolean;
    lenderId: string;
    onDeleteRequest: (t: DeleteTarget) => void;
}) {
    const isInv = type === "investment";

    if (isLoading) {
        return <div className="p-4"><TableSkeleton rows={4} /></div>;
    }

    if (!rows.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                {isInv
                    ? <TrendingDown className="h-10 w-10 opacity-30" />
                    : <TrendingUp className="h-10 w-10 opacity-30" />}
                <p className="text-sm font-medium">No {isInv ? "investments" : "repayments"} recorded yet</p>
            </div>
        );
    }

    // Mobile cards
    const MobileCards = () => (
        <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
            {rows.map(row => {
                const amount = isInv
                    ? (row as IInvestmentRow).amountReceived
                    : (row as IRepaymentRow).amountPaid;
                const rowId = isInv ? (row as IInvestmentRow).investmentId : (row as IRepaymentRow).repaymentId;
                const note = isInv ? (row as IInvestmentRow).notes : (row as IRepaymentRow).remarks;
                const rType = !isInv ? ((row as IRepaymentRow).repaymentType ?? "Principal") : null;
                return (
                    <div key={row._id} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">{rowId}</span>
                            <div className="flex items-center gap-1.5">
                                {rType && (
                                    <span className={cn(
                                        "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                        rType === "Profit"
                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                    )}>
                                        {rType === "Profit" ? "📈 Profit" : "💰 Principal"}
                                    </span>
                                )}
                                <ModeBadge mode={row.mode} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" /> {fmtDate(row.date)}
                            </span>
                            <span className={cn("text-base font-bold tabular-nums", isInv ? "text-violet-500" : "text-emerald-500")}>
                                {formatCurrency(amount)}
                            </span>
                        </div>
                        {row.referenceNo && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Hash className="h-3 w-3" /> Ref: {row.referenceNo}
                            </div>
                        )}
                        {note && (
                            <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0" /> {note}
                            </div>
                        )}
                        {/* Delete button — admin only */}
                        <AdminOnly>
                            <div className="pt-2 border-t border-border/60 flex justify-end">
                                <Button
                                    variant="ghost" size="sm"
                                    className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => onDeleteRequest({
                                        _id: row._id,
                                        id: rowId,
                                        type,
                                        amount,
                                        date: row.date,
                                    })}
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                </Button>
                            </div>
                        </AdminOnly>
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            <MobileCards />
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">#</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                            {!isInv && (
                                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Type</TableHead>
                            )}
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                                {isInv ? "Amount Received" : "Amount Paid"}
                            </TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Mode</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Reference</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => {
                            const amount = isInv ? (row as IInvestmentRow).amountReceived : (row as IRepaymentRow).amountPaid;
                            const txId = isInv ? (row as IInvestmentRow).investmentId : (row as IRepaymentRow).repaymentId;
                            const note = isInv ? (row as IInvestmentRow).notes : (row as IRepaymentRow).remarks;
                            const rType = !isInv ? ((row as IRepaymentRow).repaymentType ?? "Principal") : null;
                            return (
                                <TableRow key={row._id} className="border-border hover:bg-muted/30 transition-colors group">
                                    <TableCell className="text-center text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{txId}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{fmtDate(row.date)}</TableCell>
                                    {!isInv && (
                                        <TableCell>
                                            <span className={cn(
                                                "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                rType === "Profit"
                                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                            )}>
                                                {rType === "Profit" ? "📈 Profit" : "💰 Principal"}
                                            </span>
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right">
                                        <CurrencyDisplay amount={amount} variant={isInv ? "primary" : "success"} className="font-bold" />
                                    </TableCell>
                                    <TableCell><ModeBadge mode={row.mode} /></TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">{row.referenceNo || "—"}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{note || "—"}</TableCell>
                                    <TableCell>
                                        <AdminOnly>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                                title={`Delete ${isInv ? "investment" : "repayment"}`}
                                                onClick={() => onDeleteRequest({
                                                    _id: row._id,
                                                    id: txId,
                                                    type,
                                                    amount,
                                                    date: row.date,
                                                })}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </AdminOnly>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {/* Footer totals row */}
                <div className="border-t border-border bg-muted/20 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                        <span className="text-xs text-muted-foreground">Total:</span>
                        <CurrencyDisplay
                            amount={rows.reduce((s, r) => s + (isInv ? (r as IInvestmentRow).amountReceived : (r as IRepaymentRow).amountPaid), 0)}
                            variant={isInv ? "primary" : "success"}
                            size="lg"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
