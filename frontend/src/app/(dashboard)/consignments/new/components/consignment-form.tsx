"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import axios from "@config/axios";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { formatApiErrors } from "@lib/formatApiErrors";
import { formatCurrency } from "@lib/currency";
import { cn } from "@/lib/utils";
import { createConsignmentSchema } from "@schemas/consignment";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Store, CreditCard, Bike, Car, ArrowLeft, ArrowRight, Check,
    IndianRupee, User, Calendar, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import Link from "next/link";

type FormData = z.infer<typeof createConsignmentSchema>;

const COST_FIELDS = [
    { key: "workshopRepairCost", label: "Workshop / Repair" },
    { key: "sparePartsAccessories", label: "Spare Parts" },
    { key: "paintingPolishingCost", label: "Painting / Polishing" },
    { key: "washingDetailingCost", label: "Washing / Detailing" },
    { key: "fuelCost", label: "Fuel" },
    { key: "paperworkTaxInsurance", label: "Paperwork / Tax / Insurance" },
    { key: "commission", label: "Commission" },
    { key: "otherExpenses", label: "Other Expenses" },
] as const;

const SOURCE_TYPES = ["friend", "customer", "agent", "owner", "other"] as const;

// ── Type Selector ─────────────────────────────────────────────────
const TypeSelector = ({ onSelect }: { onSelect: (type: SaleType) => void }) => (
    <div className="flex flex-col gap-6 pb-10">
        <div className="flex items-center gap-3">
            <Link href="/consignments" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
            </Link>
        </div>
        <div>
            <h1 className="text-2xl font-bold text-foreground">Register Consignment</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose the type of consignment to register</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
            {/* Park Sale */}
            <button onClick={() => onSelect("park_sale")}
                className="group rounded-2xl border-2 border-border bg-card p-6 text-left hover:border-violet-500/60 hover:bg-violet-500/5 transition-all duration-200 shadow-sm hover:shadow-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 mb-5 group-hover:bg-violet-500/20 transition-colors">
                    <Store className="h-7 w-7 text-violet-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">🏪 Park Sale</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Vehicle owner parks their bike/car at the shop. You recondition and sell it, keep your commission, then pay the owner from the proceeds.
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-violet-400">
                    Select Park Sale <ArrowRight className="h-3.5 w-3.5" />
                </div>
            </button>
            {/* Finance Sale */}
            <button onClick={() => onSelect("finance_sale")}
                className="group rounded-2xl border-2 border-border bg-card p-6 text-left hover:border-blue-500/60 hover:bg-blue-500/5 transition-all duration-200 shadow-sm hover:shadow-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 mb-5 group-hover:bg-blue-500/20 transition-colors">
                    <CreditCard className="h-7 w-7 text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">💳 Finance Sale</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    A financed vehicle (under active loan). You recondition and sell it, keep your commission, then pay the finance entity from the proceeds.
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-blue-400">
                    Select Finance Sale <ArrowRight className="h-3.5 w-3.5" />
                </div>
            </button>
        </div>
    </div>
);

// ── Progress Stepper ──────────────────────────────────────────────
const STEPS = ["Vehicle & Source", "Reconditioning Costs", "Review & Submit"];

const Stepper = ({ step, saleType }: { step: number; saleType: SaleType }) => (
    <div className="flex items-center gap-2 mb-6">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold shrink-0", saleType === "park_sale" ? "bg-violet-500/20 text-violet-400" : "bg-blue-500/20 text-blue-400")}>
            {saleType === "park_sale" ? <Store className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
        </div>
        <span className="text-sm font-semibold text-foreground">{saleType === "park_sale" ? "Park Sale" : "Finance Sale"}</span>
        <div className="ml-4 flex items-center gap-2">
            {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all", i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground")}>
                        {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={cn("text-xs hidden sm:block", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
                    {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
                </div>
            ))}
        </div>
    </div>
);

// ── Cost Number Input ─────────────────────────────────────────────
const CostInput = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="relative w-32">
            <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input type="number" min="0" className="h-8 pl-6 text-sm text-right bg-muted/50 border-border"
                value={value || ""}
                onChange={e => onChange(parseFloat(e.target.value) || 0)} />
        </div>
    </div>
);

// ── Owner Search ──────────────────────────────────────────────────
const OwnerSearch = ({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { data } = useQuery<VehicleOwnerPaginatedData | null>({
        queryKey: ["vehicle-owners", searchTerm],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<VehicleOwnerPaginatedData>>("/vehicle-owners", {
                params: { search: searchTerm, limit: 10 },
            });
            return res.data.data ?? null;
        },
        enabled: open,
    });

    const owners = data?.data ?? [];

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full h-9 border border-border bg-muted/50 rounded-md px-3 text-sm text-left flex items-center justify-between">
                <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || "Select from owner registry..."}</span>
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {open && (
                <div className="absolute top-10 left-0 right-0 z-20 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border">
                        <Input placeholder="Search owners..." className="h-8 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                        {owners.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">No owners found</p>
                        ) : owners.map(o => (
                            <button key={o._id} type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                                onClick={() => { onChange(o._id, o.name); setOpen(false); }}>
                                <span>{o.name}</span>
                                {o.phone && <span className="text-xs text-muted-foreground">{o.phone}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Form ─────────────────────────────────────────────────────
export const ConsignmentForm = () => {
    const router = useRouter();
    const [saleType, setSaleType] = useState<SaleType | null>(null);
    const [step, setStep] = useState(0);
    const [tid, setTid] = useState<string | number | undefined>();
    const [selectedOwnerName, setSelectedOwnerName] = useState("");

    const form = useForm<FormData>({
        resolver: zodResolver(createConsignmentSchema),
        defaultValues: {
            saleType: "park_sale",
            vehicleType: "two_wheeler",
            make: "", model: "", registrationNo: "",
            previousOwner: "", dateReceived: new Date().toISOString().split("T")[0],
            sourceType: "owner",
            purchasePrice: 0,
            workshopRepairCost: 0, sparePartsAccessories: 0, paintingPolishingCost: 0,
            washingDetailingCost: 0, fuelCost: 0, paperworkTaxInsurance: 0, commission: 0, otherExpenses: 0,
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: FormData) => {
            setTid(toast.loading("Registering consignment..."));
            return axios.post<ApiResponse<IConsignmentVehicle>>("/consignments", values);
        },
        onSuccess: (res) => {
            toast.success("Consignment registered!", { id: tid });
            router.push(`/consignments/${res.data.data._id}`);
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message });
        },
    });

    const watchedValues = form.watch();
    const totalRecon = COST_FIELDS.reduce((s, f) => s + (watchedValues[f.key as keyof FormData] as number || 0), 0);
    const totalInvestment = (watchedValues.purchasePrice || 0) + totalRecon;

    if (!saleType) return <TypeSelector onSelect={(t) => { setSaleType(t); form.setValue("saleType", t); }} />;

    const accentColor = saleType === "park_sale" ? "violet" : "blue";

    return (
        <div className="flex flex-col gap-5 pb-10 max-w-2xl">
            <Link href="/consignments" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                <ArrowLeft className="h-4 w-4" /> Back to Consignments
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-foreground">Register Consignment</h1>
            </div>

            <Stepper step={step} saleType={saleType} />

            <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-5">

                    {/* ── Step 0: Vehicle & Source ── */}
                    {step === 0 && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                            <div className={cn("px-5 py-4 border-b border-border", accentColor === "violet" ? "bg-violet-500/5" : "bg-blue-500/5")}>
                                <div className="flex items-center gap-2">
                                    <Car className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-bold text-foreground">Vehicle Details</p>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="vehicleType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Vehicle Type *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="two_wheeler"><span className="flex items-center gap-2"><Bike className="h-3.5 w-3.5" />Two Wheeler</span></SelectItem>
                                                    <SelectItem value="four_wheeler"><span className="flex items-center gap-2"><Car className="h-3.5 w-3.5" />Four Wheeler</span></SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="year" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Year</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="2020" className="h-9 bg-muted/50 border-border text-sm"
                                                    value={field.value ?? ""}
                                                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="make" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Make *</FormLabel>
                                            <FormControl><Input placeholder="Honda, Yamaha..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="model" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Model *</FormLabel>
                                            <FormControl><Input placeholder="Dio 2019, FZ V3..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="registrationNo" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">Registration Number *</FormLabel>
                                        <FormControl><Input placeholder="KL52P2711" className="h-9 bg-muted/50 border-border text-sm uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Color</FormLabel>
                                            <FormControl><Input placeholder="Black, Red..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="dateReceived" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Date Received *</FormLabel>
                                            <FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* Source section */}
                            <div className={cn("px-5 py-4 border-t border-b border-border", accentColor === "violet" ? "bg-violet-500/5" : "bg-blue-500/5")}>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-bold text-foreground">
                                        {saleType === "park_sale" ? "Owner Details" : "Previous Owner & Finance"}
                                    </p>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                {saleType === "park_sale" && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-foreground">Select from Owner Registry</label>
                                        <OwnerSearch value={selectedOwnerName} onChange={(id, name) => {
                                            form.setValue("ownerId", id);
                                            form.setValue("previousOwner", name);
                                            setSelectedOwnerName(name);
                                        }} />
                                        <p className="text-[11px] text-muted-foreground">Or type a name below manually</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="previousOwner" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">{saleType === "park_sale" ? "Owner Name" : "Previous Owner"} *</FormLabel>
                                            <FormControl><Input placeholder="Name" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="previousOwnerPhone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Phone</FormLabel>
                                            <FormControl><Input placeholder="+91 9876543210" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                {saleType === "finance_sale" && (
                                    <FormField control={form.control} name="financeCompany" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Finance Company (optional)</FormLabel>
                                            <FormControl><Input placeholder="e.g. Bajaj Finance, HDFC..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                )}
                                <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">Purchase Price (₹) <span className="text-muted-foreground font-normal">— usually 0 for park sale</span></FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                <Input type="number" min="0" className="h-9 pl-6 bg-muted/50 border-border text-sm"
                                                    value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )} />
                                {saleType === "park_sale" && (
                                    <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Owner Agreement (Optional)</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField control={form.control} name="expectedPrice" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold">Expected Price (₹)</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                            <Input type="number" min="0" className="h-9 pl-6 bg-muted/50 border-border text-sm"
                                                                value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="agreedDuration" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold">Duration (days)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="0" placeholder="30" className="h-9 bg-muted/50 border-border text-sm"
                                                            value={field.value ?? ""} onChange={e => field.onChange(parseInt(e.target.value) || undefined)} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="agreementNotes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold">Agreement Notes</FormLabel>
                                                <FormControl><Textarea placeholder="e.g. Owner wants min ₹65K, commission ₹2K..." rows={2} className="resize-none text-sm bg-muted/50 border-border" {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                )}
                                <FormField control={form.control} name="sourceNotes" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">Source Notes</FormLabel>
                                        <FormControl><Textarea placeholder="Any additional context..." rows={2} className="resize-none text-sm bg-muted/50 border-border" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    )}

                    {/* ── Step 1: Costs ── */}
                    {step === 1 && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                            <div className={cn("px-5 py-4 border-b border-border", accentColor === "violet" ? "bg-violet-500/5" : "bg-blue-500/5")}>
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-bold text-foreground">Reconditioning Costs</p>
                                </div>
                            </div>
                            <div className="p-5">
                                {COST_FIELDS.map(f => (
                                    <FormField key={f.key} control={form.control} name={f.key as keyof FormData} render={({ field }) => (
                                        <CostInput label={f.label} value={Number(field.value) || 0} onChange={field.onChange} />
                                    )} />
                                ))}

                                {/* Totals summary */}
                                <div className="mt-5 rounded-xl bg-muted/30 border border-border p-4 space-y-2">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Purchase Price</span>
                                        <span>{formatCurrency(watchedValues.purchasePrice || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Reconditioning</span>
                                        <span>{formatCurrency(totalRecon)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2 mt-2">
                                        <span>Total Investment</span>
                                        <span>{formatCurrency(totalInvestment)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Review ── */}
                    {step === 2 && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                            <div className={cn("px-5 py-4 border-b border-border", accentColor === "violet" ? "bg-violet-500/5" : "bg-blue-500/5")}>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-bold text-foreground">Review & Submit</p>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                {[
                                    { label: "Sale Type", value: saleType === "park_sale" ? "🏪 Park Sale" : "💳 Finance Sale" },
                                    { label: "Vehicle Type", value: watchedValues.vehicleType === "two_wheeler" ? "🏍️ Two Wheeler" : "🚗 Four Wheeler" },
                                    { label: "Make & Model", value: `${watchedValues.make} ${watchedValues.model}` + (watchedValues.year ? ` ${watchedValues.year}` : "") },
                                    { label: "Registration No", value: watchedValues.registrationNo },
                                    { label: saleType === "park_sale" ? "Owner" : "Previous Owner", value: watchedValues.previousOwner },
                                    { label: "Date Received", value: watchedValues.dateReceived },
                                    { label: "Purchase Price", value: formatCurrency(watchedValues.purchasePrice || 0) },
                                    { label: "Reconditioning", value: formatCurrency(totalRecon) },
                                    { label: "Total Investment", value: formatCurrency(totalInvestment), highlight: true },
                                ].map(r => (
                                    <div key={r.label} className={cn("flex justify-between text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0", r.highlight ? "font-bold text-foreground" : "")}>
                                        <span className="text-muted-foreground">{r.label}</span>
                                        <span className={r.highlight ? "text-foreground" : "text-foreground"}>{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between gap-3">
                        <Button type="button" variant="outline" className="border-border"
                            onClick={() => step === 0 ? setSaleType(null) : setStep(s => s - 1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                        {step < 2 ? (
                            <Button type="button"
                                className={cn("text-white", accentColor === "violet" ? "bg-violet-600 hover:bg-violet-700" : "bg-blue-600 hover:bg-blue-700")}
                                onClick={async () => {
                                    // Validate step 0 fields before moving to step 1
                                    if (step === 0) {
                                        const ok = await form.trigger(["make", "model", "registrationNo", "previousOwner", "dateReceived"]);
                                        if (!ok) return;
                                    }
                                    setStep(s => s + 1);
                                }}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button type="submit" disabled={isPending}
                                className={cn("text-white", accentColor === "violet" ? "bg-violet-600 hover:bg-violet-700" : "bg-blue-600 hover:bg-blue-700")}>
                                {isPending ? "Registering..." : "Register Consignment"}
                                {!isPending && <Check className="ml-2 h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default ConsignmentForm;
