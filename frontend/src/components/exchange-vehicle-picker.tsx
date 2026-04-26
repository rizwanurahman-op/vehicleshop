"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { cn } from "@/lib/utils";
import { Loader2, Search, X, CheckCircle2, AlertTriangle, Bike, Car } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
export interface ExchangeLookupResult {
    _id: string;
    collection: "vehicles" | "consignmentVehicles";
    refId: string;                          // vehicleId or consignmentId
    saleType: string | null;                // null for phase2, "park_sale"/"finance_sale" for phase3
    vehicleType: "two_wheeler" | "four_wheeler";
    make: string;
    model: string;
    registrationNo: string;
    status: string;
    color: string | null;
    year: number | null;
}

export interface ExchangeVehicleValue {
    registrationNo: string;
    make: string;
    model: string;
    vehicleType: "two_wheeler" | "four_wheeler";
    // set when selected from existing inventory
    existingId?: string;
    existingCollection?: "vehicles" | "consignmentVehicles";
    isLinkedToInventory: boolean;
}

interface ExchangeVehiclePickerProps {
    /** Current form values (so the picker can show pre-filled state) */
    regNo: string;
    make: string;
    model: string;
    vehicleType: "two_wheeler" | "four_wheeler";
    /** createExchangeAs on the form — used to show duplicate warning */
    createExchangeAs?: string;
    /** Called when any field changes (from picker select or manual edit) */
    onChange: (v: ExchangeVehicleValue) => void;
    /** For consistent disabled state */
    disabled?: boolean;
}

// ── Status badge labels ───────────────────────────────────────────
const statusLabel: Record<string, string> = {
    in_stock: "In Stock", reconditioning: "Reconditioning",
    ready_for_sale: "Ready", sold: "Sold", sold_pending: "Sold (Pending)",
    exchanged: "Exchanged", received: "Received", returned: "Returned",
};
const statusColor: Record<string, string> = {
    in_stock: "bg-emerald-500/10 text-emerald-400",
    reconditioning: "bg-yellow-500/10 text-yellow-400",
    ready_for_sale: "bg-blue-500/10 text-blue-400",
    sold: "bg-muted text-muted-foreground",
    sold_pending: "bg-orange-500/10 text-orange-400",
    exchanged: "bg-purple-500/10 text-purple-400",
    received: "bg-emerald-500/10 text-emerald-400",
    returned: "bg-muted text-muted-foreground",
};

const phaseLabel = (r: ExchangeLookupResult) => {
    if (r.collection === "vehicles") return "P2";
    return r.saleType === "park_sale" ? "P3 Park" : "P3 Fin";
};
const phaseColor = (r: ExchangeLookupResult) => {
    if (r.collection === "vehicles") return "bg-primary/10 text-primary";
    return r.saleType === "park_sale" ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400";
};

// ── Component ────────────────────────────────────────────────────
export const ExchangeVehiclePicker = ({
    regNo, make, model, vehicleType, createExchangeAs, onChange, disabled,
}: ExchangeVehiclePickerProps) => {
    const [searchQ, setSearchQ] = useState(regNo);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<ExchangeLookupResult | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // sync external regNo to search box when parent resets form
    useEffect(() => {
        if (!regNo) { setSearchQ(""); setSelected(null); }
    }, [regNo]);

    // close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const { data: results = [], isFetching } = useQuery<ExchangeLookupResult[]>({
        queryKey: ["exchange-lookup", searchQ],
        queryFn: async () => {
            if (searchQ.trim().length < 2) return [];
            const res = await axios.get<ApiResponse<ExchangeLookupResult[]>>("/vehicles/lookup", {
                params: { q: searchQ.trim() },
            });
            return res.data.data ?? [];
        },
        enabled: searchQ.trim().length >= 2 && !selected,
        staleTime: 30_000,
    });

    const handleSelect = useCallback((r: ExchangeLookupResult) => {
        setSelected(r);
        setSearchQ(r.registrationNo);
        setOpen(false);
        onChange({
            registrationNo: r.registrationNo,
            make: r.make,
            model: r.model,
            vehicleType: r.vehicleType,
            existingId: r._id,
            existingCollection: r.collection,
            isLinkedToInventory: true,
        });
    }, [onChange]);

    const handleManualRegNoChange = useCallback((val: string) => {
        const upper = val.toUpperCase();
        setSearchQ(upper);
        setSelected(null);
        setOpen(upper.length >= 2);
        onChange({
            registrationNo: upper,
            make,
            model,
            vehicleType,
            isLinkedToInventory: false,
        });
    }, [make, model, vehicleType, onChange]);

    const handleMakeModelChange = useCallback((field: "make" | "model" | "vehicleType", val: string) => {
        onChange({
            registrationNo: searchQ,
            make: field === "make" ? val : make,
            model: field === "model" ? val : model,
            vehicleType: field === "vehicleType" ? (val as "two_wheeler" | "four_wheeler") : vehicleType,
            existingId: selected?._id,
            existingCollection: selected?.collection,
            isLinkedToInventory: !!selected,
        });
    }, [searchQ, make, model, vehicleType, selected, onChange]);

    const handleClear = useCallback(() => {
        setSelected(null);
        setSearchQ("");
        setOpen(false);
        onChange({ registrationNo: "", make: "", model: "", vehicleType: "two_wheeler", isLinkedToInventory: false });
    }, [onChange]);

    const showDuplicateWarning = selected && createExchangeAs && createExchangeAs !== "skip";

    return (
        <div className="space-y-3">
            {/* ── Reg Number Search ── */}
            <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Registration Number
                </label>
                <div ref={containerRef} className="relative">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            disabled={disabled}
                            value={searchQ}
                            onChange={e => handleManualRegNoChange(e.target.value)}
                            onFocus={() => { if (searchQ.length >= 2 && !selected) setOpen(true); }}
                            placeholder="KL52P2711 — type to search inventory..."
                            className={cn(
                                "w-full h-9 pl-8 pr-8 text-sm rounded-md border bg-muted/50 border-border text-foreground",
                                "outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all uppercase",
                                selected && "border-emerald-500/40 bg-emerald-500/5",
                            )}
                        />
                        {(isFetching && !selected) && (
                            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground animate-spin" />
                        )}
                        {selected && (
                            <button type="button" onClick={handleClear}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* ── Dropdown Results ── */}
                    {open && !selected && results.length > 0 && (
                        <div className="absolute z-30 top-10 left-0 right-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                            <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Found in inventory
                            </p>
                            {results.map((r) => {
                                const VIcon = r.vehicleType === "two_wheeler" ? Bike : Car;
                                return (
                                    <button key={r._id} type="button"
                                        onClick={() => handleSelect(r)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left border-t border-border/50">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                                            <VIcon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {r.make} {r.model}
                                                {r.year && <span className="text-muted-foreground font-normal"> ({r.year})</span>}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">{r.registrationNo}{r.color ? ` · ${r.color}` : ""}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", phaseColor(r))}>
                                                {phaseLabel(r)}
                                            </span>
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded", statusColor[r.status] ?? "bg-muted text-muted-foreground")}>
                                                {statusLabel[r.status] ?? r.status}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* No results hint */}
                    {open && !selected && !isFetching && results.length === 0 && searchQ.length >= 2 && (
                        <div className="absolute z-30 top-10 left-0 right-0 bg-card border border-border rounded-lg shadow-xl px-4 py-3">
                            <p className="text-xs text-muted-foreground">Not found in inventory — fill details manually below</p>
                        </div>
                    )}
                </div>

                {/* Linked badge */}
                {selected && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-medium">
                            Linked: {selected.make} {selected.model} — <span className={cn("font-bold", phaseColor(selected))}>{phaseLabel(selected)}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* ── Make / Model / Type (always editable, auto-filled if linked) ── */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Make / Model *</label>
                    <input
                        disabled={disabled}
                        value={`${make}${model ? (make ? " " : "") + model : ""}`}
                        onChange={e => {
                            const parts = e.target.value.split(" ");
                            handleMakeModelChange("make", parts[0] ?? "");
                            handleMakeModelChange("model", parts.slice(1).join(" ") ?? "");
                        }}
                        placeholder="Honda Activa 6G..."
                        className="w-full h-9 px-3 text-sm rounded-md border bg-muted/50 border-border text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Vehicle Type</label>
                    <select
                        disabled={disabled}
                        value={vehicleType}
                        onChange={e => handleMakeModelChange("vehicleType", e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-md border bg-muted/50 border-border text-foreground outline-none focus:border-primary transition-all"
                    >
                        <option value="two_wheeler">Two Wheeler</option>
                        <option value="four_wheeler">Four Wheeler</option>
                    </select>
                </div>
            </div>

            {/* ── Duplicate Warning ── */}
            {showDuplicateWarning && (
                <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-semibold text-yellow-400">Already in inventory</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            This vehicle is linked to your {selected!.collection === "vehicles" ? "Phase 2" : "Phase 3"} inventory.
                            Selecting a &ldquo;Create as&rdquo; option will add a duplicate. Choose &ldquo;Record only&rdquo; to avoid this.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExchangeVehiclePicker;
