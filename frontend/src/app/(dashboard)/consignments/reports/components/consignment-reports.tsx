"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState } from "react";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Store, CreditCard, PieChart, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReportData {
    profitLoss: IConsignmentVehicle[];
    openSettlements: IConsignmentVehicle[];
    agingReport: IConsignmentVehicle[];
    monthlyTrends: { byReceivedMonth: unknown[]; bySoldMonth: unknown[] };
    costAnalysis: { avgWorkshop?: number; avgSpareParts?: number; avgPainting?: number; avgWashing?: number; avgFuel?: number; avgPaperwork?: number; avgCommission?: number; avgOtherExpenses?: number; avgTotalRecon?: number };
}

const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold", color ?? "text-foreground")}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
);

export const ConsignmentReports = () => {
    const [saleType, setSaleType] = useState<string>("all");

    const { data, isLoading } = useQuery<{ data: ReportData } | null>({
        queryKey: ["consignment-reports", saleType],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (saleType !== "all") params.saleType = saleType;
            const res = await axios.get<ApiResponse<ReportData>>("/consignments/reports", { params });
            return res.data ?? null;
        },
    });

    const report = data?.data;

    const totalRevenue = report?.profitLoss.reduce((s, v) => s + (v.soldPrice || 0), 0) ?? 0;
    const totalNetProfit = report?.profitLoss.reduce((s, v) => s + v.netProfit, 0) ?? 0;
    const profitableCount = report?.profitLoss.filter(v => v.netProfit >= 0).length ?? 0;
    const avgDays = report?.profitLoss.length
        ? Math.round(report.profitLoss.reduce((s, v) => s + (v.daysInShop || 0), 0) / report.profitLoss.length)
        : 0;

    return (
        <div className="flex flex-col gap-5 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Consignment Reports</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Park Sale & Finance Sale analytics</p>
                </div>
                <Select value={saleType} onValueChange={setSaleType}>
                    <SelectTrigger className="h-9 w-40 bg-muted/50 border-border text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="park_sale"><Store className="inline h-3.5 w-3.5 mr-1" />Park Sale</SelectItem>
                        <SelectItem value="finance_sale"><CreditCard className="inline h-3.5 w-3.5 mr-1" />Finance Sale</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub={`${report?.profitLoss.length ?? 0} vehicles sold`} />
                        <StatCard label="Net Profit" value={formatCurrency(Math.abs(totalNetProfit))} sub={totalNetProfit >= 0 ? "Profitable" : "Loss"} color={totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400"} />
                        <StatCard label="Profitable Deals" value={String(profitableCount)} sub={`of ${report?.profitLoss.length ?? 0} sold`} />
                        <StatCard label="Avg Days in Shop" value={avgDays ? `${avgDays}d` : "—"} sub="Turnaround time" color="text-blue-400" />
                    </div>

                    {/* P&L Table */}
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-bold text-foreground">Profit & Loss — Sold Vehicles</p>
                        </div>
                        {!report?.profitLoss.length ? (
                            <div className="p-10 text-center text-muted-foreground text-sm">No sold vehicles in this period</div>
                        ) : (
                            <>
                                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2 border-b border-border bg-muted/20">
                                    {["Vehicle", "Sold Price", "Recon", "Paid Out", "Net Profit"].map(h => (
                                        <p key={h} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{h}</p>
                                    ))}
                                </div>
                                {report.profitLoss.map((v, i) => {
                                    const isProfit = v.netProfit >= 0;
                                    return (
                                        <div key={v._id} className={cn("grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{v.make} {v.model}</p>
                                                <p className="text-xs text-muted-foreground">{v.registrationNo} · {formatDate(v.dateSold!)}</p>
                                            </div>
                                            <p className="text-sm text-foreground">{formatCurrency(v.soldPrice!)}</p>
                                            <p className="text-sm text-muted-foreground">-{formatCurrency(v.totalReconCost)}</p>
                                            <p className="text-sm text-muted-foreground">-{formatCurrency(v.paidToPayee)}</p>
                                            <p className={cn("text-sm font-bold flex items-center gap-1", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                {isProfit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                                {isProfit ? "+" : ""}{formatCurrency(v.netProfit)}
                                            </p>
                                        </div>
                                    );
                                })}
                                <div className="border-t-2 border-border px-5 py-3 flex justify-between font-bold bg-muted/20">
                                    <span className="text-sm">Total Net Profit</span>
                                    <span className={cn("text-sm", totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                        {totalNetProfit >= 0 ? "+" : ""}{formatCurrency(totalNetProfit)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Open Settlements */}
                    {!!(report?.openSettlements?.length) && (
                        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-orange-500/20 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-400" />
                                <p className="text-sm font-bold text-foreground">Open Settlements ({report.openSettlements.length})</p>
                            </div>
                            {report.openSettlements.map((v, i) => (
                                <div key={v._id} className={cn("flex items-center justify-between px-5 py-3", i > 0 ? "border-t border-orange-500/10" : "")}>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{v.make} {v.model} — {v.registrationNo}</p>
                                        <p className="text-xs text-muted-foreground">{v.previousOwner} · Sold {formatDate(v.dateSold!)}</p>
                                    </div>
                                    <div className="text-right">
                                        {(v.buyerBalance) > 0 && <p className="text-xs text-orange-400">Buyer owes: {formatCurrency(v.buyerBalance)}</p>}
                                        {(v.payeeBalance) > 0 && <p className="text-xs text-primary">We owe: {formatCurrency(v.payeeBalance)}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Aging Report */}
                    {!!(report?.agingReport?.length) && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-bold text-foreground">Aging Report — Vehicles in Shop</p>
                            </div>
                            {report.agingReport.map((v, i) => {
                                const isOld = (v.daysInShop ?? 0) > 30;
                                return (
                                    <div key={v._id} className={cn("flex items-center justify-between px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{v.make} {v.model}</p>
                                            <p className="text-xs text-muted-foreground">{v.registrationNo} · {v.previousOwner}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm text-muted-foreground">{formatCurrency(v.totalInvestment)}</p>
                                            <Badge className={cn("text-[10px]", isOld ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400")}>
                                                <Clock className="mr-1 h-2.5 w-2.5" />{v.daysInShop}d
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Cost Analysis */}
                    {report?.costAnalysis?.avgTotalRecon != null && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-bold text-foreground">Avg Reconditioning Cost (sold vehicles)</p>
                            </div>
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Workshop", val: report.costAnalysis.avgWorkshop },
                                    { label: "Spare Parts", val: report.costAnalysis.avgSpareParts },
                                    { label: "Painting", val: report.costAnalysis.avgPainting },
                                    { label: "Washing", val: report.costAnalysis.avgWashing },
                                    { label: "Fuel", val: report.costAnalysis.avgFuel },
                                    { label: "Paperwork", val: report.costAnalysis.avgPaperwork },
                                    { label: "Commission", val: report.costAnalysis.avgCommission },
                                    { label: "Other", val: report.costAnalysis.avgOtherExpenses },
                                ].map(c => (
                                    <div key={c.label} className="text-center">
                                        <p className="text-[11px] text-muted-foreground">{c.label}</p>
                                        <p className="text-sm font-semibold text-foreground">{formatCurrency(Math.round(c.val || 0))}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-border px-5 py-3 flex justify-between">
                                <span className="text-sm font-semibold text-foreground">Avg Total Recon</span>
                                <span className="text-sm font-bold text-primary">{formatCurrency(Math.round(report.costAnalysis.avgTotalRecon || 0))}</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ConsignmentReports;
