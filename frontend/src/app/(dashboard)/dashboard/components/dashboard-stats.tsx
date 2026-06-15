"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { formatINR, formatINRCompact } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import {
    TrendingUp, Users, Wallet,
    ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCardsSkeleton } from "@components/shared";

const fetchDashboardStats = async (): Promise<IDashboardStats | null> => {
    const res = await axios.get<ApiResponse<IDashboardStats>>("/summary/dashboard");
    return res.data.data ?? null;
};

type StatCardProps = {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    badge?: { label: string; cls: string };
};

/**
 * Auto-scale font size by character length.
 * Icon is absolutely positioned so full card width is available for the number.
 * Even a 10-char Indian number (e.g. ₹54,04,900) fits on one line at text-xl.
 */
const valueSizeClass = (formatted: string): string => {
    const len = formatted.length;
    if (len <= 5)  return "text-3xl";   // ₹999, 13
    if (len <= 7)  return "text-2xl";   // ₹7,500
    if (len <= 10) return "text-xl";    // ₹54,04,900  (~10L)
    if (len <= 13) return "text-lg";    // ₹10,00,00,000  (~10Cr)
    if (len <= 16) return "text-base";  // ₹1,00,00,00,000  (~100Cr)
    return "text-sm";                   // ₹1,000 Cr+
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, bg, badge }: StatCardProps) => {
    const isNumeric      = typeof value === "number";
    const fullFormatted  = isNumeric ? formatINR(value)       : String(value);
    const compactHint    = isNumeric ? formatINRCompact(value) : "";
    const showHint       = isNumeric && compactHint !== fullFormatted;
    const sizeClass      = valueSizeClass(fullFormatted);

    return (
        <Card className="bg-card border-border group relative overflow-hidden transition-all hover:border-primary/30">
            <CardContent className="relative p-5 pr-16">
                {/* Icon — absolutely positioned top-right so it never squeezes the number */}
                <div className={cn(
                    "absolute top-4 right-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    bg,
                )}>
                    <Icon className={cn("h-5 w-5", color)} />
                </div>

                {/* Title + optional badge */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-none">
                        {title}
                    </p>
                    {badge && (
                        <span className={cn(
                            "inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                            badge.cls,
                        )}>
                            {badge.label}
                        </span>
                    )}
                </div>

                {/* Primary value — full format, whitespace-nowrap prevents mid-digit breaks.
                     overflow-hidden + title ensure extreme crore values never break layout. */}
                <p
                    title={fullFormatted}
                    className={cn(
                        "font-mono font-bold tabular-nums text-foreground whitespace-nowrap overflow-hidden leading-tight",
                        sizeClass,
                    )}
                >
                    {fullFormatted}
                </p>

                {/* Subtitle */}
                <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{subtitle}</p>

                {/* Compact hint — dimmed, only for values large enough to need it */}
                {showHint && (
                    <p className="mt-1 text-[10px] font-semibold text-muted-foreground/50 font-mono">
                        ≈ {compactHint}
                    </p>
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

    const financeCards: StatCardProps[] = [
        {
            title: "Total Borrowed",
            value: data?.totalBorrowed ?? 0,
            subtitle: `From ${data?.totalLenders ?? 0} lenders`,
            icon: ArrowDownLeft,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
        },
        {
            title: "Principal Repaid",
            value: data?.totalRepaid ?? 0,
            subtitle: "Reduces outstanding balance",
            icon: ArrowUpRight,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            badge: { label: "💰 Principal", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" },
        },
        {
            title: "Profit Paid",
            value: data?.totalProfit ?? 0,
            subtitle: "Interest paid — balance unchanged",
            icon: TrendingUp,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            badge: { label: "📈 Profit", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" },
        },
        {
            title: "Outstanding",
            value: data?.totalOutstanding ?? 0,
            subtitle: "Principal balance payable",
            icon: Wallet,
            color: "text-warning",
            bg: "bg-warning/10",
        },
        {
            title: "Active Lenders",
            value: String(data?.activeLenders ?? 0),
            subtitle: `${data?.totalLenders ?? 0} total registered`,
            icon: Users,
            color: "text-primary",
            bg: "bg-primary/10",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:grid-cols-5">
            {financeCards.map(s => <StatCard key={s.title} {...s} />)}
        </div>
    );
};

export default DashboardStats;
