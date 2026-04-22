"use client";

import { cn } from "@/lib/utils";
import { VEHICLE_STATUSES, SALE_STATUSES, NOC_STATUSES } from "@data/vehicle-constants";

interface VehicleStatusBadgeProps {
    status?: VehicleStatus;
    saleStatus?: SaleStatus;
    nocStatus?: NOCStatus;
    size?: "sm" | "md";
}

const STATUS_STYLES: Record<string, string> = {
    in_stock: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    reconditioning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    ready_for_sale: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    sold: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    sold_pending: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    exchanged: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    fully_received: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    balance_pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    noc_pending: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    noc_cash_pending: "bg-red-500/15 text-red-400 border-red-500/20",
    not_applicable: "bg-muted/50 text-muted-foreground border-border",
    pending: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    received: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    submitted: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const VehicleStatusBadge = ({ status, saleStatus, nocStatus, size = "sm" }: VehicleStatusBadgeProps) => {
    if (saleStatus) {
        const s = SALE_STATUSES.find((s) => s.value === saleStatus);
        return (
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-semibold", size === "sm" ? "text-[10px]" : "text-xs", STATUS_STYLES[saleStatus] || "bg-muted text-muted-foreground border-border")}>
                {s?.label || saleStatus}
            </span>
        );
    }
    if (nocStatus && nocStatus !== "not_applicable") {
        const n = NOC_STATUSES.find((n) => n.value === nocStatus);
        return (
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-semibold", size === "sm" ? "text-[10px]" : "text-xs", STATUS_STYLES[nocStatus] || "bg-muted text-muted-foreground border-border")}>
                NOC: {n?.label || nocStatus}
            </span>
        );
    }
    if (status) {
        const s = VEHICLE_STATUSES.find((s) => s.value === status);
        return (
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-semibold", size === "sm" ? "text-[10px]" : "text-xs", STATUS_STYLES[status] || "bg-muted text-muted-foreground border-border")}>
                {s?.label || status}
            </span>
        );
    }
    return null;
};

export default VehicleStatusBadge;
