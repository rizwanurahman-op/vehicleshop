"use client";

import { cn } from "@/lib/utils";
import { Bike, Car } from "lucide-react";

const VehicleTypeIcon = ({ type, className, showLabel = false }: { type: VehicleType; className?: string; showLabel?: boolean }) => {
    const Icon = type === "two_wheeler" ? Bike : Car;
    const label = type === "two_wheeler" ? "Two Wheeler" : "Four Wheeler";
    return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
            <Icon className="h-4 w-4 shrink-0" />
            {showLabel && <span className="text-xs">{label}</span>}
        </span>
    );
};

export default VehicleTypeIcon;
