"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@lib/currency";
import {
    Car, AlertTriangle, ArrowRight, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Mini stat tile ───────────────────────────────────────────────
const Tile = ({
    label, value, sub, color = "text-foreground", bg = "bg-muted/40",
}: {
    label: string; value: string; sub: string; color?: string; bg?: string;
}) => (
    <div className={cn("rounded-lg border border-border p-3", bg)}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        <p className={cn("text-base font-bold truncate", color)}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
);

// ── Domain Section (vehicles / consignments) ─────────────────────
const DomainCard = ({
    icon: Icon, title, href, tiles, pendingAlerts,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    href: string;
    tiles: { label: string; value: string; sub: string; color?: string; bg?: string }[];
    pendingAlerts?: { label: string; count: number; amount?: number; color: string; dot: string }[];
}) => (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-md">
                    <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="font-bold text-foreground">{title}</p>
            </div>
            <Link href={href}>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
            </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(t => <Tile key={t.label} {...t} />)}
        </div>

        {pendingAlerts && pendingAlerts.filter(a => a.count > 0).length > 0 && (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">Needs Attention</p>
                </div>
                <div className="space-y-1">
                    {pendingAlerts.filter(a => a.count > 0).map(a => (
                        <div key={a.label} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className={cn("h-1.5 w-1.5 rounded-full", a.dot)} />
                                <span className={a.color}>{a.count} {a.label}</span>
                            </div>
                            {a.amount != null && a.amount > 0 && (
                                <span className={cn("font-semibold", a.color)}>{formatCurrency(a.amount)}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

type Props = { data: IDashboardStats | null };

const VehicleOverview = ({ data }: Props) => {
    const v = data?.vehicleStats;
    const c = data?.consignmentStats;

    const isVProfit   = (v?.netProfit ?? 0) >= 0;
    const isCProfit   = (c?.netProfit ?? 0) >= 0;

    const vehicleTiles = [
        {
            label: "In Stock",
            value: String(v?.inStock ?? 0),
            sub: `${v?.total ?? 0} total owned`,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
        },
        {
            label: "Total Invested",
            value: formatCurrency(v?.totalInvested ?? 0),
            sub: `${v?.total ?? 0} vehicles`,
        },
        {
            label: "Revenue",
            value: formatCurrency(v?.totalRevenue ?? 0),
            sub: `${(v?.sold ?? 0) + (v?.soldPending ?? 0)} sold`,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Net Profit",
            value: `${isVProfit ? "+" : "-"}${formatCurrency(Math.abs(v?.netProfit ?? 0))}`,
            sub: `${v?.exchanged ?? 0} exchanged`,
            color: isVProfit ? "text-emerald-400" : "text-red-400",
            bg: isVProfit ? "bg-emerald-500/10" : "bg-red-500/10",
        },
    ];

    const vehiclePending = [
        { label: "balance pending", count: v?.balancePending ?? 0, amount: v?.balancePendingAmt ?? 0, color: "text-red-400", dot: "bg-red-400" },
    ];

    const consignmentTiles = [
        {
            label: "In Shop",
            value: String(c?.active ?? 0),
            sub: `${c?.total ?? 0} total consignments`,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
        },
        {
            label: "Park & Sale",
            value: String(c?.parkSale ?? 0),
            sub: "Owner agreement basis",
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
        },
        {
            label: "Finance Sale",
            value: String(c?.financeSale ?? 0),
            sub: "Finance-assisted sales",
            color: "text-violet-400",
            bg: "bg-violet-500/10",
        },
        {
            label: "Net Profit",
            value: `${isCProfit ? "+" : "-"}${formatCurrency(Math.abs(c?.netProfit ?? 0))}`,
            sub: `${c?.sold ?? 0} sold`,
            color: isCProfit ? "text-emerald-400" : "text-red-400",
            bg: isCProfit ? "bg-emerald-500/10" : "bg-red-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DomainCard
                icon={Car}
                title="Own Vehicles"
                href="/vehicles"
                tiles={vehicleTiles}
                pendingAlerts={vehiclePending}
            />
            <DomainCard
                icon={Layers}
                title="Consignments"
                href="/consignments"
                tiles={consignmentTiles}
            />
        </div>
    );
};

export default VehicleOverview;
