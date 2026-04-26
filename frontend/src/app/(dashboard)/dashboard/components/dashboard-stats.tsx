"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { formatINRCompact } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCardsSkeleton } from "@components/shared";

const fetchDashboardStats = async (): Promise<IDashboardStats | null> => {
    const res = await axios.get<ApiResponse<IDashboardStats>>("/summary/dashboard");
    return res.data.data ?? null;
};

type StatCardProps = {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: "primary" | "success" | "warning" | "destructive";
    trend?: number;
};

const StatCard = ({ title, value, subtitle, icon: Icon, variant, trend }: StatCardProps) => {
    const variantConfig = {
        primary: { bg: "bg-primary/10", text: "text-primary", gradient: "from-primary/5" },
        success: { bg: "bg-success/10", text: "text-success", gradient: "from-success/5" },
        warning: { bg: "bg-warning/10", text: "text-warning", gradient: "from-warning/5" },
        destructive: { bg: "bg-destructive/10", text: "text-destructive", gradient: "from-destructive/5" },
    };
    const v = variantConfig[variant];

    return (
        <Card className="bg-card border-border group relative overflow-hidden transition-all hover:border-primary/30 card-hover-glow">
            <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100", v.gradient)} />
            <CardContent className="relative p-5">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
                        <p className={cn("mt-2 font-mono text-2xl font-bold tabular-nums text-foreground")}>{formatINRCompact(value)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", v.bg)}>
                        <Icon className={cn("h-6 w-6", v.text)} />
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={cn("mt-3 flex items-center gap-1 text-xs font-medium", trend >= 0 ? "text-success" : "text-destructive")}>
                        {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{Math.abs(trend).toFixed(1)}% vs last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

type DashboardStatsProps = { initialData: IDashboardStats | null };

const DashboardStats = ({ initialData }: DashboardStatsProps) => {
    const { data, isLoading } = useQuery<IDashboardStats | null>({
        queryKey: ["dashboard-stats"],
        queryFn: fetchDashboardStats,
        initialData,
        retry: 0,
    });

    if (isLoading && !data) return <StatCardsSkeleton />;

    const stats = [
        {
            title: "Total Borrowed",
            value: data?.totalBorrowed ?? 0,
            subtitle: `From ${data?.totalLenders ?? 0} lenders`,
            icon: ArrowDownLeft,
            variant: "primary" as const,
        },
        {
            title: "Total Repaid",
            value: data?.totalRepaid ?? 0,
            subtitle: "Principal returned",
            icon: ArrowUpRight,
            variant: "success" as const,
        },
        {
            title: "Outstanding",
            value: data?.totalOutstanding ?? 0,
            subtitle: "Balance payable",
            icon: Wallet,
            variant: "warning" as const,
        },
        {
            title: "Active Lenders",
            value: data?.activeLenders ?? 0,
            subtitle: `${data?.totalLenders ?? 0} total registered`,
            icon: Users,
            variant: "primary" as const,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map(s => (
                <StatCard key={s.title} {...s} />
            ))}
        </div>
    );
};

export default DashboardStats;
