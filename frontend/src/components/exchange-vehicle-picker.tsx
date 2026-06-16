"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { cn } from "@/lib/utils";
import {
    Loader2, Search, X, CheckCircle2, Bike, Car,
    ArrowLeftRight, RefreshCw,
} from "lucide-react";
import { MakeSelect } from "@/components/make-select";

// ── Types ─────────────────────────────────────────────────────────
export interface ExchangeLookupResult {
    _id: string;
    collection: "vehicles" | "consignmentVehicles";
    refId: string;
    saleType: string | null;
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
    year?: number | null;
    color?: string;
    existingId?: string;
    existingCollection?: "vehicles" | "consignmentVehicles";
    isLinkedToInventory: boolean;
}

interface ExchangeVehiclePickerProps {
    make: string;
    regNo: string;
    model?: string;
    vehicleType: "two_wheeler" | "four_wheeler";
    createExchangeAs?: string;
    onChange: (v: ExchangeVehicleValue) => void;
    disabled?: boolean;
}

// ── Status helpers ────────────────────────────────────────────────
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
    if (r.collection === "vehicles") return "P2 Purchased";
    return r.saleType === "park_sale" ? "P3 Park Sale" : "P3 Finance";
};
const phaseColor = (r: ExchangeLookupResult) => {
    if (r.collection === "vehicles") return "bg-primary/10 text-primary";
    return r.saleType === "park_sale" ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400";
};

// ── Main Picker ───────────────────────────────────────────────────
export const ExchangeVehiclePicker = ({
    make: propMake, regNo: propRegNo, vehicleType: propVehicleType,
    onChange, disabled,
}: ExchangeVehiclePickerProps) => {

    const [regNo, setRegNo] = useState(propRegNo || "");
    const [make, setMake] = useState(propMake || "");
    const [model, setModel] = useState("");
    const [vehicleType, setVehicleType] = useState<"two_wheeler" | "four_wheeler">(propVehicleType || "two_wheeler");
    const [year, setYear] = useState<string>("");
    const [color, setColor] = useState("");

    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<ExchangeLookupResult | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync when parent resets form (all props go blank)
    useEffect(() => {
        if (!propRegNo && !propMake) {
            setRegNo(""); setMake(""); setModel(""); setYear(""); setColor("");
            setSelected(null); setOpen(false);
            setVehicleType("two_wheeler");
        }
    }, [propRegNo, propMake]);

    // Close dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    // Inventory lookup
    const { data: results = [], isFetching } = useQuery<ExchangeLookupResult[]>({
        queryKey: ["exchange-lookup", regNo],
        queryFn: async () => {
            if (regNo.trim().length < 2) return [];
            const res = await axios.get<ApiResponse<ExchangeLookupResult[]>>("/vehicles/lookup", {
                params: { q: regNo.trim() },
            });
            return res.data.data ?? [];
        },
        enabled: regNo.trim().length >= 2 && !selected,
        staleTime: 30_000,
    });

    // Emit full value upward
    const emit = useCallback((overrides: Partial<{
        regNo: string; make: string; model: string;
        vehicleType: "two_wheeler" | "four_wheeler";
        year: string; color: string;
        existingId?: string; existingCollection?: "vehicles" | "consignmentVehicles";
        linked: boolean;
    }>) => {
        const r = overrides.regNo ?? regNo;
        const m = overrides.make ?? make;
        const mo = overrides.model ?? model;
        const vt = overrides.vehicleType ?? vehicleType;
        const yr = overrides.year !== undefined ? overrides.year : year;
        const cl = overrides.color !== undefined ? overrides.color : color;
        onChange({
            registrationNo: r,
            make: m,
            model: mo,
            vehicleType: vt,
            year: yr ? parseInt(yr, 10) : null,
            color: cl || undefined,
            existingId: overrides.existingId,
            existingCollection: overrides.existingCollection,
            isLinkedToInventory: overrides.linked ?? false,
        });
    }, [regNo, make, model, vehicleType, year, color, onChange]);

    const handleSelect = (r: ExchangeLookupResult) => {
        setSelected(r);
        setRegNo(r.registrationNo);
        setMake(r.make);
        setModel(r.model);
        setVehicleType(r.vehicleType);
        setYear(r.year ? String(r.year) : "");
        setColor(r.color || "");
        setOpen(false);
        onChange({
            registrationNo: r.registrationNo,
            make: r.make, model: r.model,
            vehicleType: r.vehicleType,
            year: r.year, color: r.color || undefined,
            existingId: r._id, existingCollection: r.collection,
            isLinkedToInventory: true,
        });
    };

    const handleClear = () => {
        setSelected(null);
        setRegNo(""); setMake(""); setModel(""); setYear(""); setColor("");
        setVehicleType("two_wheeler"); setOpen(false);
        onChange({ registrationNo: "", make: "", model: "", vehicleType: "two_wheeler", isLinkedToInventory: false });
    };

    const onRegNoChange = (val: string) => {
        const upper = val.toUpperCase();
        setRegNo(upper); setSelected(null); setOpen(upper.length >= 2);
        emit({ regNo: upper, linked: false });
    };
    const onMakeChange = (val: string) => { setMake(val); emit({ make: val, linked: !!selected }); };
    const onModelChange = (val: string) => { setModel(val); emit({ model: val, linked: !!selected }); };
    const onTypeChange = (val: "two_wheeler" | "four_wheeler") => {
        setVehicleType(val);
        // Reset make when type changes so user picks from new list
        setMake(""); emit({ vehicleType: val, make: "", linked: !!selected });
    };
    const onYearChange = (val: string) => { setYear(val); emit({ year: val, linked: !!selected }); };
    const onColorChange = (val: string) => { setColor(val); emit({ color: val, linked: !!selected }); };

    const isNewVehicle = !selected;

    return (
        <div className="space-y-3">

            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">
                    {selected ? "Linked from Inventory" : "Trade-In Vehicle Details"}
                </p>
                {selected && (
                    <button type="button" onClick={handleClear}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        <RefreshCw className="h-2.5 w-2.5" />Clear &amp; enter manually
                    </button>
                )}
            </div>

            {/* Registration Number search */}
            <div ref={containerRef} className="relative">
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Registration Number <span className="text-[10px] text-muted-foreground font-normal">(searches your inventory)</span>
                </label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        disabled={disabled}
                        value={regNo}
                        onChange={e => onRegNoChange(e.target.value)}
                        onFocus={() => { if (regNo.length >= 2 && !selected) setOpen(true); }}
                        placeholder="e.g. KL52P2711"
                        className={cn(
                            "w-full h-9 pl-8 pr-8 text-sm rounded-md border bg-muted/50 border-border text-foreground",
                            "outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all uppercase placeholder:normal-case",
                            selected && "border-emerald-500/40 bg-emerald-500/5",
                        )}
                    />
                    {isFetching && !selected && (
                        <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                    {selected && (
                        <button type="button" onClick={handleClear} title="Clear"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Inventory dropdown */}
                {open && !selected && results.length > 0 && (
                    <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                        <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Found in inventory</p>
                        {results.map((r) => {
                            const VIcon = r.vehicleType === "two_wheeler" ? Bike : Car;
                            return (
                                <button key={r._id} type="button" onClick={() => handleSelect(r)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left border-t border-border/40">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                                        <VIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {r.make} {r.model}{r.year && <span className="text-muted-foreground font-normal"> ({r.year})</span>}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground font-mono">{r.registrationNo}{r.color ? ` · ${r.color}` : ""}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", phaseColor(r))}>{phaseLabel(r)}</span>
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", statusColor[r.status] ?? "bg-muted text-muted-foreground")}>{statusLabel[r.status] ?? r.status}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                {open && !selected && !isFetching && results.length === 0 && regNo.length >= 2 && (
                    <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-card border border-border rounded-xl shadow-xl px-4 py-3">
                        <p className="text-xs font-semibold text-foreground">Not in your inventory</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">New vehicle — fill in the details below to register it.</p>
                    </div>
                )}
            </div>

            {/* Linked from inventory badge */}
            {selected && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-emerald-400">Linked from inventory</p>
                        <p className="text-[10px] text-muted-foreground truncate">{selected.make} {selected.model} · <span className={cn("font-bold", phaseColor(selected))}>{phaseLabel(selected)}</span></p>
                    </div>
                    <ArrowLeftRight className="h-3 w-3 text-emerald-400/60 shrink-0" />
                </div>
            )}

            {/* New vehicle hint */}
            {isNewVehicle && regNo.length > 0 && (
                <div className="rounded-lg bg-orange-500/5 border border-orange-500/15 px-3 py-2">
                    <p className="text-[11px] text-orange-300/80">
                        <span className="font-bold text-orange-300">Registering new vehicle</span> — fill in the details below. This trade-in will be added to your Purchased Vehicles page.
                    </p>
                </div>
            )}

            {/* Vehicle Type (first — because make list depends on it) */}
            <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-2">
                    {(["two_wheeler", "four_wheeler"] as const).map(vt => (
                        <button
                            key={vt}
                            type="button"
                            disabled={disabled}
                            onClick={() => onTypeChange(vt)}
                            className={cn(
                                "h-9 rounded-md border text-sm font-medium transition-all flex items-center justify-center gap-2",
                                vehicleType === vt
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            {vt === "two_wheeler" ? <><Bike className="h-4 w-4" /> Two Wheeler</> : <><Car className="h-4 w-4" /> Four Wheeler</>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Make — searchable select with Other option */}
            <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Make <span className="text-destructive">*</span>
                </label>
                <MakeSelect
                    value={make}
                    vehicleType={vehicleType}
                    onChange={onMakeChange}
                    disabled={disabled}
                />
            </div>

            {/* Model */}
            <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Model <span className="text-destructive">*</span>
                </label>
                <input
                    disabled={disabled}
                    value={model}
                    onChange={e => onModelChange(e.target.value)}
                    placeholder={vehicleType === "two_wheeler" ? "Activa 6G, Pulsar 150, FZ-S…" : "Swift, Creta, Innova, Nexon…"}
                    className="w-full h-9 px-3 text-sm rounded-md border bg-muted/50 border-border text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
            </div>

            {/* Year + Color */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Year <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                        disabled={disabled}
                        type="number"
                        value={year}
                        onChange={e => onYearChange(e.target.value)}
                        placeholder={`e.g. ${new Date().getFullYear() - 2}`}
                        min={1990}
                        max={new Date().getFullYear() + 1}
                        className="w-full h-9 px-3 text-sm rounded-md border bg-muted/50 border-border text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Color <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                        disabled={disabled}
                        value={color}
                        onChange={e => onColorChange(e.target.value)}
                        placeholder="Red, Blue, Black…"
                        className="w-full h-9 px-3 text-sm rounded-md border bg-muted/50 border-border text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
            </div>
        </div>
    );
};

export default ExchangeVehiclePicker;
