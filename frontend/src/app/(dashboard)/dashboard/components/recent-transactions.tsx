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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Lender</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx, i) => (
                                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-foreground">{tx.lenderName}</div>
                                            <div className="font-mono-id text-muted-foreground">{tx.lenderId}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[11px] font-semibold gap-1",
                                                    tx.type === "investment"
                                                        ? "bg-primary/10 text-primary border-primary/20"
                                                        : "bg-success/10 text-success border-success/20"
                                                )}
                                            >
                                                {tx.type === "investment" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                {tx.type === "investment" ? "Investment" : "Repayment"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={cn(
                                                "font-mono text-sm font-semibold tabular-nums",
                                                tx.type === "investment" ? "text-primary" : "text-success"
                                            )}>
                                                {formatINR(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="text-[11px]">{tx.mode}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentTransactions;
