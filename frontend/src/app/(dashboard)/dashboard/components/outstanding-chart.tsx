"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { formatINRCompact } from "@/lib/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fetchDashboardStats = async (): Promise<IDashboardStats | null> => {
    const res = await axios.get<ApiResponse<IDashboardStats>>("/summary/dashboard");
    return res.data.data ?? null;
};

type OutstandingChartProps = { initialData: IDashboardStats | null };

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-sm font-mono text-warning">{formatINRCompact(payload[0]?.value ?? 0)}</p>
            </div>
        );
    }
    return null;
};

const OutstandingChart = ({ initialData }: OutstandingChartProps) => {
    const { data } = useQuery<IDashboardStats | null>({
        queryKey: ["dashboard-stats"],
        queryFn: fetchDashboardStats,
        initialData,
        retry: 0,
    });

    const chartData = (data?.topOutstanding ?? []).map(t => ({
        name: t.name.length > 10 ? t.name.slice(0, 10) + "…" : t.name,
        balance: t.balance,
    }));

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <BarChart3 className="h-4 w-4 text-warning" />
                    Top Outstanding Balances
                </CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        No outstanding balances
                    </div>
                ) : (
                    <div className="h-[250px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                <XAxis type="number" tickFormatter={v => formatINRCompact(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
                                <Bar dataKey="balance" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} maxBarSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default OutstandingChart;
