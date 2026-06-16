"use client";

/**
 * MakeSelect — a searchable combobox for vehicle make.
 *
 * • Shows a curated brand list based on vehicleType (2W or 4W).
 * • Includes an in-dropdown search filter.
 * • "Other / Custom…" option reveals a free-text input.
 * • Works as a controlled component: value + onChange.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, CheckCircle2, Search, X } from "lucide-react";
import { VEHICLE_MAKES_2W, VEHICLE_MAKES_4W } from "@data/vehicle-constants";

interface MakeSelectProps {
    value: string;
    vehicleType: "two_wheeler" | "four_wheeler";
    onChange: (v: string) => void;
    disabled?: boolean;
    /** Extra className for the trigger button */
    className?: string;
}

export const MakeSelect = ({
    value,
    vehicleType,
    onChange,
    disabled,
    className,
}: MakeSelectProps) => {
    const makes = vehicleType === "two_wheeler" ? VEHICLE_MAKES_2W : VEHICLE_MAKES_4W;

    // Derive initial "other" state: value exists but isn't in the list
    const valueInList = (v: string) =>
        makes.includes(v as (typeof makes)[number]);

    const [showCustom, setShowCustom] = useState(
        () => !!value && !valueInList(value)
    );
    const [dropOpen, setDropOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const dropRef = useRef<HTMLDivElement>(null);

    // Sync when parent resets or vehicleType changes
    useEffect(() => {
        if (!value) {
            setShowCustom(false);
            setFilter("");
        } else if (!valueInList(value)) {
            setShowCustom(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, vehicleType]);

    // Close on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node))
                setDropOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = makes.filter((m) =>
        m.toLowerCase().includes(filter.toLowerCase())
    );

    const handleSelect = (m: string) => {
        setDropOpen(false);
        setFilter("");
        if (m === "Other") {
            setShowCustom(true);
            onChange(""); // clear so user types
        } else {
            setShowCustom(false);
            onChange(m);
        }
    };

    const displayLabel = showCustom
        ? value
            ? `Other: ${value}`
            : "Other / Custom…"
        : value || "";

    return (
        <div className="space-y-2">
            {/* ── Dropdown trigger ── */}
            <div ref={dropRef} className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setDropOpen((o) => !o)}
                    className={cn(
                        "w-full h-9 px-3 text-sm rounded-md border bg-muted/50 border-border",
                        "text-left flex items-center justify-between",
                        "outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all",
                        !value && "text-muted-foreground",
                        dropOpen && "border-primary ring-1 ring-primary/30",
                        className
                    )}
                >
                    <span className="truncate flex-1">
                        {displayLabel || "Select make…"}
                    </span>
                    <ChevronDown
                        className={cn(
                            "ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                            dropOpen && "rotate-180"
                        )}
                    />
                </button>

                {dropOpen && (
                    <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                        {/* Search */}
                        <div className="p-2 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                <input
                                    autoFocus
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    placeholder="Search make…"
                                    className="w-full h-7 pl-6 pr-2 text-xs rounded-md bg-muted/50 border border-border text-foreground outline-none focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-44 overflow-y-auto">
                            {filtered.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleSelect(m)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center justify-between",
                                        value === m &&
                                        "bg-primary/10 text-primary font-semibold"
                                    )}
                                >
                                    {m}
                                    {value === m && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                    )}
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="px-3 py-2 text-xs text-muted-foreground">
                                    No match — choose Other below
                                </p>
                            )}
                        </div>

                        {/* Other — always pinned at bottom */}
                        <div className="border-t border-border">
                            <button
                                type="button"
                                onClick={() => handleSelect("Other")}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-muted-foreground italic",
                                    showCustom &&
                                    "bg-orange-500/10 text-orange-400 font-medium not-italic"
                                )}
                            >
                                ✏️ Other / Custom…
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Free-text input when Other is chosen ── */}
            {showCustom && (
                <div className="relative">
                    <input
                        autoFocus
                        disabled={disabled}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Type make name (e.g. Ather, Ola, Triumph…)"
                        className={cn(
                            "w-full h-9 px-3 pr-8 text-sm rounded-md border",
                            "bg-orange-500/5 border-orange-500/30 text-foreground",
                            "outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        )}
                    />
                    <button
                        type="button"
                        title="Back to list"
                        onClick={() => {
                            setShowCustom(false);
                            onChange("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MakeSelect;
