"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINRCompact } from "@/lib/currency";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

const fetchSummary = async (): Promise<ILenderSummary[]> => {
    const res = await axios.get<ApiResponse<ILenderSummary[]>>("/summary/lenders", { params: { page: 1, limit: 100 } });
    return res.data.data ?? [];
};

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)"];

type SummaryChartsProps = { initialData: ILenderSummary[] | null };

const SummaryCharts = ({ initialData }: SummaryChartsProps) => {
    const { data } = useQuery<ILenderSummary[]>({
        queryKey: ["lender-summary"],
        queryFn: fetchSummary,
        initialData: initialData ?? undefined,
        retry: 0,
    });

    const pieData = (data ?? [])
        .filter(l => l.totalBorrowed > 0)
        .slice(0, 5)
        .map(l => ({ name: l.name, value: l.totalBorrowed }));

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Investment Share by Lender
                </CardTitle>
            </CardHeader>
            <CardContent>
                {pieData.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data available</div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                                {pieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={((value: number) => formatINRCompact(value)) as unknown as undefined} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
};

export default SummaryCharts;
