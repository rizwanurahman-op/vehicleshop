"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { formatCurrency } from "@lib/currency";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3, AlertTriangle, ShoppingCart, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@lib/date";

const fetchStats = async (): Promise<IVehicleDashboardStats | null> => {
    const res = await axios.get<ApiResponse<IVehicleDashboardStats>>("/vehicles/stats");
    return res.data.data ?? null;
};

const fetchPLReport = async (): Promise<IVehicle[]> => {
    const res = await axios.get<ApiResponse<IVehicle[]>>("/vehicles/reports/profit-loss");
    return res.data.data ?? [];
};

const fetchPending = async (): Promise<IVehicle[]> => {
    const res = await axios.get<ApiResponse<IVehicle[]>>("/vehicles/reports/pending");
    return res.data.data ?? [];
};

interface PurchaseDueVehicle {
    _id: string;
    vehicleId: string;
    make: string;
    model: string;
    registrationNo: string;
    purchasedFrom: string;
    datePurchased: string;
    purchasePrice: number;
    purchasePendingAmount: number;
    purchasePaymentStatus: string;
}

interface PurchaseRegisterData {
    data: PurchaseDueVehicle[];
    stats: { totalPurchasePrice: number; totalPaid: number; totalPending: number; pendingCount: number };
}

const fetchPurchaseDue = async (): Promise<PurchaseRegisterData | null> => {
    const res = await axios.get<ApiResponse<PurchaseRegisterData>>("/vehicles/reports/purchases", {
        params: { paymentStatus: "partial", limit: 50 },
    });
    // also fetch "pending"
    const res2 = await axios.get<ApiResponse<PurchaseRegisterData>>("/vehicles/reports/purchases", {
        params: { paymentStatus: "pending", limit: 50 },
    });
    const data1 = res.data.data?.data ?? [];
    const data2 = res2.data.data?.data ?? [];
    const stats = res.data.data?.stats ?? { totalPurchasePrice: 0, totalPaid: 0, totalPending: 0, pendingCount: 0 };
    const stats2 = res2.data.data?.stats ?? { totalPurchasePrice: 0, totalPaid: 0, totalPending: 0, pendingCount: 0 };
    return {
        data: [...data1, ...data2],
        stats: {
            totalPurchasePrice: stats.totalPurchasePrice + stats2.totalPurchasePrice,
            totalPaid: stats.totalPaid + stats2.totalPaid,
            totalPending: stats.totalPending + stats2.totalPending,
            pendingCount: stats.pendingCount + stats2.pendingCount,
        }
    };
};

const VehicleReports = () => {
    const { data: stats, isLoading: statsLoading } = useQuery<IVehicleDashboardStats | null>({ queryKey: ["vehicle-stats"], queryFn: fetchStats, retry: 0 });
    const { data: plReport = [], isLoading: plLoading } = useQuery<IVehicle[]>({ queryKey: ["vehicle-pl-report"], queryFn: fetchPLReport, retry: 0 });
    const { data: pending = [], isLoading: pendingLoading } = useQuery<IVehicle[]>({ queryKey: ["vehicle-pending-report"], queryFn: fetchPending, retry: 0 });
    const { data: purchaseDueData, isLoading: purchaseDueLoading } = useQuery<PurchaseRegisterData | null>({ queryKey: ["purchase-due-report"], queryFn: fetchPurchaseDue, retry: 0 });

    const combined = stats?.combined;
    const purchaseDue = purchaseDueData?.data ?? [];
    const purchaseDueStats = purchaseDueData?.stats;

    const StatCard = ({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color?: string; icon?: React.ComponentType<{ className?: string }> }) => (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
                {Icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></div>}
            </div>
            <p className={cn("text-xl font-bold", color || "text-foreground")}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    );

    return (
        <div className="flex w-full flex-col gap-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Vehicle Reports & Analytics</h1>
                    <p className="text-sm text-muted-foreground">Comprehensive view of your vehicle business</p>
                </div>
            </div>

            {/* Overview Stats */}
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Combined Overview</p>
                {statsLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Total Vehicles" value={combined?.total?.toString() || "0"} sub={`${combined?.inStock || 0} in stock`} icon={Package} />
                        <StatCard label="Total Invested" value={formatCurrency(combined?.totalInvested || 0)} sub="All purchases + costs" icon={DollarSign} />
                        <StatCard label="Total Revenue" value={formatCurrency(combined?.totalRevenue || 0)} sub={`${(combined?.sold || 0) + (combined?.soldPending || 0)} sold`} icon={TrendingUp} color="text-emerald-400" />
                        <StatCard label="Net Profit" value={formatCurrency(combined?.netProfit || 0)} sub={`${(combined?.avgMargin || 0).toFixed(1)}% margin (sold only)`} icon={BarChart3} color={(combined?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"} />
                    </div>
                )}
            </div>

            {/* 2W vs 4W Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { label: "Two Wheelers 🏍️", data: stats?.twoWheelers, color: "text-blue-400" },
                    { label: "Four Wheelers 🚗", data: stats?.fourWheelers, color: "text-indigo-400" },
                ].map(({ label, data, color }) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-5">
                        <p className="font-bold text-foreground mb-4">{label}</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { l: "Total", v: (data?.total || 0).toString() },
                                { l: "In Stock", v: (data?.inStock || 0).toString() },
                                { l: "Invested", v: formatCurrency(data?.totalInvested || 0) },
                                { l: "Revenue", v: formatCurrency(data?.totalRevenue || 0) },
                                { l: "Net Profit", v: formatCurrency(data?.netProfit || 0) },
                                { l: "Balance Due", v: formatCurrency(data?.totalBalancePending || 0) },
                            ].map((row) => (
                                <div key={row.l}>
                                    <p className="text-xs text-muted-foreground">{row.l}</p>
                                    <p className={cn("font-bold text-sm mt-0.5", row.l === "Net Profit" ? color : "text-foreground")}>{row.v}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Purchase Payments Due ─────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <ShoppingCart className="h-4 w-4 text-orange-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Purchase Payments Due to Sellers</p>
                        {purchaseDueStats && purchaseDueStats.pendingCount > 0 && (
                            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                {formatCurrency(purchaseDueStats.totalPending)} pending
                            </span>
                        )}
                    </div>
                    <Link href="/purchases" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        View all <ExternalLink className="h-3 w-3" />
                    </Link>
                </div>
                {purchaseDueLoading ? (
                    <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
                ) : purchaseDue.length === 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                        <p className="text-emerald-400 font-semibold text-sm">✅ All seller payments are up to date!</p>
                        <p className="text-xs text-muted-foreground mt-1">No pending purchase payments found.</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        {["Vehicle", "Reg. No.", "Seller", "Purchased On", "Purchase Price", "Amount Due", "Status"].map((h) => (
                                            <th key={h} className={cn("px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                                                ["Purchase Price", "Amount Due"].includes(h) ? "text-right" : "text-left")}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {purchaseDue.map((v) => (
                                        <tr key={v._id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-foreground whitespace-nowrap">{v.make} {v.model}</p>
                                                <p className="text-xs text-muted-foreground">{v.vehicleId}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-foreground whitespace-nowrap">{v.registrationNo}</td>
                                            <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{v.purchasedFrom}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(v.datePurchased)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-medium text-foreground whitespace-nowrap">{formatCurrency(v.purchasePrice)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-red-400 whitespace-nowrap">{formatCurrency(v.purchasePendingAmount)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                                                    v.purchasePaymentStatus === "partial" ? "bg-orange-500/15 text-orange-400" : "bg-red-500/15 text-red-400")}>
                                                    {v.purchasePaymentStatus === "partial" ? "Partial" : "Not Paid"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Sale Payments Pending */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sale Payments Pending from Buyers</p>
                </div>
                {pendingLoading ? (
                    <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
                ) : pending.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">No pending items 🎉</div>
                ) : (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        {["Vehicle", "Reg. No.", "Buyer", "Sale Status", "Balance Due", "NOC Status"].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {pending.map((v) => (
                                        <tr key={v._id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-foreground whitespace-nowrap">{v.make} {v.model}</p>
                                                <p className="text-xs text-muted-foreground">{v.vehicleId}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-foreground whitespace-nowrap">{v.registrationNo}</td>
                                            <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{v.soldTo || "—"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {v.saleStatus ? (
                                                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                                                        v.saleStatus === "fully_received" ? "bg-emerald-500/15 text-emerald-400" : "bg-orange-500/15 text-orange-400")}>
                                                        {v.saleStatus.replace(/_/g, " ")}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-red-400 whitespace-nowrap">{formatCurrency(v.balanceAmount)}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{v.nocStatus.replace(/_/g, " ")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* P&L Table */}
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Vehicle-wise P&L (Sold Only)</p>
                {plLoading ? (
                    <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
                ) : plReport.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">No sold vehicles yet</div>
                ) : (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        {["Vehicle", "Reg. No.", "Purchased", "Sold", "Invested", "Sold At", "Profit/Loss", "Margin", "Days"].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {plReport.map((v) => {
                                        const isProfit = v.profitLoss >= 0;
                                        return (
                                            <tr key={v._id} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-foreground whitespace-nowrap">{v.make} {v.model}</p>
                                                    <p className="text-[11px] text-muted-foreground">{v.vehicleId}</p>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-mono text-foreground whitespace-nowrap">{v.registrationNo}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{v.datePurchased ? new Date(v.datePurchased).toLocaleDateString("en-IN") : "—"}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{v.dateSold ? new Date(v.dateSold).toLocaleDateString("en-IN") : "—"}</td>
                                                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{formatCurrency(v.totalInvestment)}</td>
                                                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{formatCurrency(v.soldPrice || 0)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={cn("flex items-center gap-1 font-bold text-sm", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                        {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                        {isProfit ? "+" : ""}{formatCurrency(v.profitLoss)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={cn("text-sm font-semibold", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                        {isProfit ? "+" : ""}{v.profitLossPercentage.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{v.daysToSell != null ? `${v.daysToSell}d` : "—"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VehicleReports;
