"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@components/shared";

const fetchDashboardStats = async (): Promise<IDashboardStats | null> => {
    const res = await axios.get<ApiResponse<IDashboardStats>>("/summary/dashboard");
    return res.data.data ?? null;
};

type RecentTransactionsProps = { initialData: IDashboardStats | null };

const RecentTransactions = ({ initialData }: RecentTransactionsProps) => {
    const { data, isLoading } = useQuery<IDashboardStats | null>({
        queryKey: ["dashboard-stats"],
        queryFn: fetchDashboardStats,
        initialData,
        retry: 0,
    });

    const transactions = data?.recentTransactions ?? [];

    return (
        <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    Recent Transactions
                </CardTitle>
                <Badge variant="outline" className="text-xs">Last 10</Badge>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading && !data ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : transactions.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No transactions yet</div>
                ) : (
                    <>
                        {/* Mobile List (< md) */}
                        <div className="grid grid-cols-1 gap-3 p-3 md:hidden bg-muted/5">
                            {transactions.map((tx, i) => (
                                <div key={i} className="flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:border-primary/30 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-sm shrink-0", tx.type === "investment" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500")}>
                                                {tx.type === "investment" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <p className="text-sm font-bold text-foreground leading-none truncate">{tx.lenderName}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(tx.date)}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[10px] font-semibold gap-1 shrink-0 px-1.5 py-0 border-transparent", tx.type === "investment" ? "text-primary bg-primary/10" : "text-emerald-500 bg-emerald-500/10")}>
                                            {tx.type === "investment" ? "Invested" : "Repaid"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-end justify-between pt-3 border-t border-border/50 border-dashed">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge variant="outline" className="text-[10px] bg-muted/50 px-1.5 py-0">{tx.mode}</Badge>
                                            <span className="text-[10px] text-muted-foreground font-mono">{tx.lenderId}</span>
                                        </div>
                                        <p className={cn("text-base font-bold tabular-nums leading-none tracking-tight shrink-0 ml-2", tx.type === "investment" ? "text-primary" : "text-emerald-500")}>
                                            {formatINR(tx.amount)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Lender</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mode</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-semibold text-foreground">{tx.lenderName}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground">{tx.lenderId}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-bold gap-1 px-1.5 py-0",
                                                        tx.type === "investment"
                                                            ? "bg-primary/5 text-primary border-primary/20"
                                                            : "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                                                    )}
                                                >
                                                    {tx.type === "investment" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                    {tx.type === "investment" ? "Investment" : "Repayment"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={cn(
                                                    "font-mono text-sm font-bold tabular-nums",
                                                    tx.type === "investment" ? "text-primary" : "text-emerald-500"
                                                )}>
                                                    {formatINR(tx.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">{tx.mode}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentTransactions;
