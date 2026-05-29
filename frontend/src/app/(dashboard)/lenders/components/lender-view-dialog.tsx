"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Users, Phone, MapPin, FileText, Calendar,
    TrendingDown, TrendingUp,
    CheckCircle2, AlertCircle, ArrowUpRight, Loader2,
} from "lucide-react";
import { formatCurrency } from "@lib/currency";
import { cn } from "@/lib/utils";

// ── Mini field row ─────────────────────────────────────────────────────────────
const Field = ({
    icon: Icon, label, value, mono = false,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value?: string | null;
    mono?: boolean;
}) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className={cn("text-sm font-medium text-foreground break-words", mono && "font-mono")}>{value}</p>
            </div>
        </div>
    );
};

// ── Metric card ────────────────────────────────────────────────────────────────
const MetricCard = ({
    label, value, sub, icon: Icon, color, border,
}: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string; border: string;
}) => (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", border)}>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", color.replace("text-", "bg-").replace("500", "500/10"))}>
            <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={cn("text-lg font-bold tabular-nums leading-tight truncate", color)}>{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ── Repayment progress bar ─────────────────────────────────────────────────────
const ProgressBar = ({ pct }: { pct: number }) => {
    const safe = Math.min(100, Math.max(0, pct));
    const color = safe >= 100 ? "bg-emerald-500" : safe >= 60 ? "bg-sky-500" : safe >= 30 ? "bg-amber-500" : "bg-red-500";
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Repayment Progress</span>
                <span className={cn("font-bold tabular-nums",
                    safe >= 100 ? "text-emerald-500" : safe >= 60 ? "text-sky-500" : safe >= 30 ? "text-amber-500" : "text-red-500"
                )}>{safe.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-700", color)}
                    style={{ width: `${safe}%` }}
                />
            </div>
        </div>
    );
};

// ── Main Dialog ────────────────────────────────────────────────────────────────
interface LenderViewDialogProps {
    lender: ILenderWithSummary | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LenderViewDialog({
    lender,
    open,
    onOpenChange,
}: LenderViewDialogProps) {

    // Fetch fresh detail for the selected lender
    const { data: detail, isLoading } = useQuery<ILenderWithSummary>({
        queryKey: ["lender-detail", lender?._id],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<ILenderWithSummary>>(`/lenders/${lender!._id}`);
            return res.data.data!;
        },
        enabled: open && !!lender?._id,
        staleTime: 30_000,
    });

    const d = detail ?? lender;

    const fmtDate = (s?: string) =>
        s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

    const pct = d?.repaymentPercentage ?? (d && d.totalBorrowed > 0 ? (d.totalRepaid / d.totalBorrowed) * 100 : 0);
    const isPaidOff = d ? d.balancePayable <= 0 : false;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col max-h-[90vh] sm:max-h-[85vh] p-0 gap-0 sm:max-w-lg w-[calc(100%-2rem)] sm:w-full overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
                
                {/* Custom premium scrollbar style */}
                <style dangerouslySetInnerHTML={{ __html: `
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(156, 163, 175, 0.25);
                        border-radius: 9999px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(156, 163, 175, 0.45);
                    }
                ` }} />

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent px-6 pt-6 pb-5 border-b border-border shrink-0">
                    {/* Decorative blobs */}
                    <div className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl" />

                    <DialogHeader className="pr-8">
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg text-white text-lg font-bold">
                                {d?.name?.charAt(0)?.toUpperCase() ?? <Users className="h-6 w-6" />}
                                {/* Active indicator */}
                                <span className={cn(
                                    "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card",
                                    d?.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                                )} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-xl font-bold text-foreground leading-tight truncate">
                                    {isLoading && !d ? "Loading…" : d?.name}
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={cn(
                                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                                        d?.isActive
                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                            : "bg-muted-foreground/10 text-muted-foreground border border-muted-foreground/20"
                                    )}>
                                        {d?.isActive
                                            ? <><CheckCircle2 className="h-2.5 w-2.5" /> Active</>
                                            : <><AlertCircle className="h-2.5 w-2.5" /> Inactive</>
                                        }
                                    </span>
                                    {isPaidOff && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            <CheckCircle2 className="h-2.5 w-2.5" /> Fully Paid
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* ── Body (Scrollable) ────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-background/30 custom-scrollbar">
                    {isLoading && !d ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Loading lender details…</span>
                        </div>
                    ) : (
                        <div className="px-6 py-5 space-y-6">

                            {/* ── Financial Metrics ────────────────────────────── */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <MetricCard
                                    label="Total Borrowed"
                                    value={formatCurrency(d?.totalBorrowed ?? 0)}
                                    sub={`${d?.investmentCount ?? 0} investment${(d?.investmentCount ?? 0) !== 1 ? "s" : ""}`}
                                    icon={TrendingDown}
                                    color="text-violet-500"
                                    border="border-violet-500/20 bg-violet-500/5"
                                />
                                <MetricCard
                                    label="Total Repaid"
                                    value={formatCurrency(d?.totalRepaid ?? 0)}
                                    sub={`${d?.repaymentCount ?? 0} repayment${(d?.repaymentCount ?? 0) !== 1 ? "s" : ""}`}
                                    icon={TrendingUp}
                                    color="text-emerald-500"
                                    border="border-emerald-500/20 bg-emerald-500/5"
                                />
                                <MetricCard
                                    label="Balance Due"
                                    value={formatCurrency(d?.balancePayable ?? 0)}
                                    sub={isPaidOff ? "Fully settled" : "Outstanding"}
                                    icon={isPaidOff ? CheckCircle2 : AlertCircle}
                                    color={isPaidOff ? "text-emerald-500" : "text-amber-500"}
                                    border={isPaidOff ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}
                                />
                            </div>

                            {/* ── Repayment Progress ───────────────────────────── */}
                            <ProgressBar pct={pct} />

                            {/* ── Contact & Info ───────────────────────────────── */}
                            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Contact & Details
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {d?.phone && (
                                        <Field icon={Phone} label="Phone" value={d.phone} mono />
                                    )}
                                    <Field icon={Calendar} label="Joined" value={fmtDate(d?.createdAt)} />
                                    <Field icon={Calendar} label="Last Updated" value={fmtDate(d?.updatedAt)} />
                                </div>
                                {d?.address && (
                                    <Field icon={MapPin} label="Address" value={d.address} />
                                )}
                                {d?.remarks && (
                                    <Field icon={FileText} label="Remarks" value={d.remarks} />
                                )}
                            </div>

                            {/* ── Activity Summary ─────────────────────────────── */}
                            {(d?.investmentCount !== undefined || d?.repaymentCount !== undefined) && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                                            <TrendingDown className="h-4 w-4 text-violet-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Investments</p>
                                            <p className="text-lg font-bold text-foreground">{d.investmentCount ?? 0}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Repayments</p>
                                            <p className="text-lg font-bold text-foreground">{d.repaymentCount ?? 0}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <div className="flex justify-end border-t border-border px-6 py-4 bg-muted/10 shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto font-medium shadow-sm hover:bg-muted/80 transition-colors"
                    >
                        Close
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}
