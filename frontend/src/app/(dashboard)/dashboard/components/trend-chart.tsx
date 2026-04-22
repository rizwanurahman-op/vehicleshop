"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { formatINRCompact } from "@/lib/currency";
import { formatMonthYear } from "@/lib/date";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const fetchDashboardStats = async (): Promise<IDashboardStats | null> => {
    const res = await axios.get<ApiResponse<IDashboardStats>>("/summary/dashboard");
    return res.data.data ?? null;
};

type TrendChartProps = { initialData: IDashboardStats | null };

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
                <p className="font-medium text-foreground mb-2">{label}</p>
                {payload.map(p => (
                    <div key={p.name} className="flex justify-between gap-6">
                        <span style={{ color: p.color }}>{p.name}</span>
                        <span className="font-mono font-semibold">{formatINRCompact(p.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const TrendChart = ({ initialData }: TrendChartProps) => {
    const { data } = useQuery<IDashboardStats | null>({
        queryKey: ["dashboard-stats"],
        queryFn: fetchDashboardStats,
        initialData,
        retry: 0,
    });

    const chartData = (data?.monthlyTrend ?? []).map(m => ({
        name: formatMonthYear(m.year, m.month),
        Invested: m.totalInvested,
        Repaid: m.totalRepaid,
    }));

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Investment vs Repayment Trend
                </CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        No trend data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={v => formatINRCompact(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="Invested" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#colorInvested)" dot={false} />
                            <Area type="monotone" dataKey="Repaid" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#colorRepaid)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
};

export default TrendChart;
