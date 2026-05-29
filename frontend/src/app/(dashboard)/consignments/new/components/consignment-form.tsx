"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import axios from "@config/axios";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { formatApiErrors } from "@lib/formatApiErrors";
import { formatCurrency } from "@lib/currency";
import { cn } from "@/lib/utils";
import { createConsignmentSchema } from "@schemas/consignment";
import { COST_CATEGORIES, VEHICLE_MAKES_2W, VEHICLE_MAKES_4W } from "@data/vehicle-constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Store, CreditCard, Bike, Car, ArrowLeft, ArrowRight, Check,
    IndianRupee, User, FileText, Plus, Trash2, Wrench, ChevronDown, ChevronUp, ChevronsUpDown
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

type FormData = z.input<typeof createConsignmentSchema>;




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
            {/* type="button" is critical — these are outside the form but setting it is best practice */}
            <button type="button" onClick={() => onSelect("park_sale")}
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
            <button type="button" onClick={() => onSelect("finance_sale")}
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




type BreakdownItem = { id: string; name: string; amount: number; date: string; notes: string };
type BreakdownMap = Record<string, BreakdownItem[]>;

// ── Main Form ─────────────────────────────────────────────────────
export const ConsignmentForm = () => {
    const router = useRouter();
    const [saleType, setSaleType] = useState<SaleType | null>(null);
    const [step, setStep] = useState(0);
    const [tid, setTid] = useState<string | number | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [breakdownMap, setBreakdownMap] = useState<BreakdownMap>({});
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
    const [dialog, setDialog] = useState<{ open: boolean; catKey: string; catLabel: string; catIcon: string }>({
        open: false, catKey: "", catLabel: "", catIcon: "",
    });
    const [newItem, setNewItem] = useState({ name: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    const [openMake, setOpenMake] = useState(false);
    const [makeSearchValue, setMakeSearchValue] = useState("");

    const form = useForm<FormData>({
        resolver: zodResolver(createConsignmentSchema),
        defaultValues: {
            saleType: "park_sale",
            vehicleType: "two_wheeler",
            make: "", model: "", registrationNo: "",
            year: null,
            color: "",
            previousOwner: "", previousOwnerPhone: "",
            financeCompany: "",
            dateReceived: new Date().toISOString().split("T")[0],
            sourceType: "owner",
            sourceNotes: "",
            expectedPrice: undefined,
            agreedDuration: undefined,
            agreementNotes: "",
            purchasePrice: 0,
            travelCost: 0, workshopRepairCost: 0, sparePartsAccessories: 0,
            alignmentWork: 0, paintingPolishingCost: 0, washingDetailingCost: 0,
            fuelCost: 0, paperworkTaxInsurance: 0, commission: 0, otherExpenses: 0,
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mutate, isPending: _isPending } = useMutation({
        mutationFn: async (values: FormData) => {
            setTid(toast.loading("Registering consignment..."));
            return axios.post<ApiResponse<IConsignmentVehicle>>("/consignments", values);
        },
        onSuccess: async (res) => {
            const consignmentId = res.data.data?._id;
            if (consignmentId) {
                for (const cat of COST_CATEGORIES) {
                    for (const item of (breakdownMap[cat.key] || [])) {
                        try {
                            await axios.post(`/consignments/${consignmentId}/costs/breakdown`, {
                                category: cat.category, name: item.name, amount: item.amount,
                                date: item.date || undefined, notes: item.notes || undefined,
                            });
                        } catch { /* non-critical */ }
                    }
                }
            }
            toast.success("Consignment registered!", { id: tid });
            router.push(`/consignments/${consignmentId}`);
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message });
        },
    });

    const openDialog = (cat: typeof COST_CATEGORIES[number]) => {
        setDialog({ open: true, catKey: cat.key, catLabel: cat.label, catIcon: cat.icon });
        setNewItem({ name: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    };

    const addBreakdownItem = () => {
        if (!newItem.name.trim() || !newItem.amount) return;
        const key = dialog.catKey;
        const item: BreakdownItem = { id: Date.now().toString(), name: newItem.name, amount: parseFloat(newItem.amount) || 0, date: newItem.date, notes: newItem.notes };
        const updated: BreakdownMap = { ...breakdownMap, [key]: [...(breakdownMap[key] || []), item] };
        setBreakdownMap(updated);
        form.setValue(key as keyof FormData, updated[key].reduce((s, i) => s + i.amount, 0) as never);
        setExpandedCats(e => ({ ...e, [key]: true }));
        setDialog(d => ({ ...d, open: false }));
    };

    const removeBreakdownItem = (catKey: string, itemId: string) => {
        const updated: BreakdownMap = { ...breakdownMap, [catKey]: (breakdownMap[catKey] || []).filter(i => i.id !== itemId) };
        setBreakdownMap(updated);
        form.setValue(catKey as keyof FormData, updated[catKey].reduce((s, i) => s + i.amount, 0) as never);
    };

    const watchedValues = form.watch();
    const totalRecon = COST_CATEGORIES.reduce((s, c) => s + (watchedValues[c.key as keyof FormData] as number || 0), 0);
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
                <form onSubmit={(e) => e.preventDefault()} className="space-y-5">

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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="make" render={({ field }) => {
                                        const makes = watchedValues.vehicleType === "two_wheeler" ? VEHICLE_MAKES_2W : VEHICLE_MAKES_4W;
                                        return (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-xs font-semibold">Vehicle Brand / Make *</FormLabel>
                                                <Popover open={openMake} onOpenChange={setOpenMake}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={openMake}
                                                                className={cn(
                                                                    "h-9 w-full justify-between bg-muted/50 border-border text-left text-sm font-normal hover:bg-muted/70 hover:text-foreground mt-1.5",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value
                                                                    ? makes.includes(field.value)
                                                                        ? field.value
                                                                        : `${field.value} (Custom)`
                                                                    : "Select or type brand..."}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-0 bg-card border-border shadow-2xl" align="start">
                                                        <Command className="bg-card">
                                                            <CommandInput 
                                                                placeholder="Search brand (e.g. Honda, Suzuki)..." 
                                                                className="h-10 text-foreground"
                                                                onValueChange={(val) => setMakeSearchValue(val)}
                                                            />
                                                            <CommandList className="max-h-[220px] overflow-y-auto">
                                                                <CommandEmpty className="py-3 px-4 text-xs text-muted-foreground">
                                                                    No matching brand found.
                                                                </CommandEmpty>
                                                                <CommandGroup className="text-foreground">
                                                                    {makeSearchValue.trim() && !makes.some(m => m.toLowerCase() === makeSearchValue.trim().toLowerCase()) && (
                                                                        <CommandItem
                                                                            value={makeSearchValue.trim()}
                                                                            onSelect={() => {
                                                                                field.onChange(makeSearchValue.trim());
                                                                                setOpenMake(false);
                                                                                setMakeSearchValue("");
                                                                            }}
                                                                            className="cursor-pointer text-sm font-semibold text-primary py-2 hover:bg-muted/50 flex items-center gap-1.5"
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                            <span>Add custom brand: &quot;{makeSearchValue.trim()}&quot;</span>
                                                                        </CommandItem>
                                                                    )}
                                                                    {makes.map((m) => (
                                                                        <CommandItem
                                                                            key={m}
                                                                            value={m}
                                                                            onSelect={() => {
                                                                                field.onChange(m);
                                                                                setOpenMake(false);
                                                                                setMakeSearchValue("");
                                                                            }}
                                                                            className="cursor-pointer text-sm py-2 hover:bg-muted/50 flex items-center justify-between"
                                                                        >
                                                                            <span className="flex items-center">
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4 text-primary",
                                                                                        m === field.value ? "opacity-100" : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                {m}
                                                                            </span>
                                                                        </CommandItem>
                                                                    ))}
                                                                    {field.value && !makes.includes(field.value) && (
                                                                        <CommandItem
                                                                            value={field.value}
                                                                            onSelect={() => {
                                                                                setOpenMake(false);
                                                                                setMakeSearchValue("");
                                                                            }}
                                                                            className="cursor-pointer font-semibold text-primary py-2 hover:bg-muted/50"
                                                                        >
                                                                            <Check className="mr-2 h-4 w-4 opacity-100" />
                                                                            {field.value} (Custom)
                                                                        </CommandItem>
                                                                    )}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                    />
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Color</FormLabel>
                                            <FormControl><Input placeholder="Black, Red..." className="h-9 bg-muted/50 border-border text-sm" {...field} value={field.value ?? ""} /></FormControl>
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                            <FormControl><Input placeholder="+91 9876543210" className="h-9 bg-muted/50 border-border text-sm" {...field} value={field.value ?? ""} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                {saleType === "finance_sale" && (
                                    <FormField control={form.control} name="financeCompany" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Finance Company (optional)</FormLabel>
                                            <FormControl><Input placeholder="e.g. Bajaj Finance, HDFC..." className="h-9 bg-muted/50 border-border text-sm" {...field} value={field.value ?? ""} /></FormControl>
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                                <FormControl><Textarea placeholder="e.g. Owner wants min ₹65K, commission ₹2K..." rows={2} className="resize-none text-sm bg-muted/50 border-border" {...field} value={field.value ?? ""} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                )}
                                <FormField control={form.control} name="sourceNotes" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">Source Notes</FormLabel>
                                        <FormControl><Textarea placeholder="Any additional context..." rows={2} className="resize-none text-sm bg-muted/50 border-border" {...field} value={field.value ?? ""} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    )}

                    {/* ── Step 1: Costs ── */}
                    {step === 1 && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                            {/* Summary bar */}
                            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                                <div className="p-4 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Purchase Price</p>
                                    <p className="text-sm font-bold text-foreground">{formatCurrency(watchedValues.purchasePrice || 0)}</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reconditioning</p>
                                    <p className="text-sm font-bold text-orange-400">+{formatCurrency(totalRecon)}</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Total Investment</p>
                                    <p className="text-sm font-bold text-primary">{formatCurrency(totalInvestment)}</p>
                                </div>
                            </div>

                            {/* Category header */}
                            <div className={cn("px-5 py-3 border-b border-border", accentColor === "violet" ? "bg-violet-500/5" : "bg-blue-500/5")}>
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-bold text-foreground">Reconditioning Costs</p>
                                    <span className="text-[10px] text-muted-foreground italic ml-1">— tap + to add named items</span>
                                </div>
                            </div>

                            {/* Cost rows */}
                            <div className="divide-y divide-border/50">
                                {COST_CATEGORIES.map(cat => {
                                    const items = breakdownMap[cat.key] || [];
                                    const hasItems = items.length > 0;
                                    const isExpanded = expandedCats[cat.key];
                                    const catAmount = (watchedValues[cat.key as keyof FormData] as number) || 0;
                                    return (
                                        <div key={cat.key}>
                                            <div className={cn("group flex items-center gap-2 px-5 py-3 hover:bg-muted/20 transition-colors", catAmount === 0 && !hasItems ? "opacity-60" : "")}>
                                                <button type="button" onClick={() => hasItems && setExpandedCats(e => ({ ...e, [cat.key]: !isExpanded }))} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                                        <span className="text-base">{cat.icon}</span>
                                                        <span className="truncate">{cat.label}</span>
                                                    </span>
                                                    {hasItems && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{items.length}</span>}
                                                    {hasItems && (isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground rotate-180" />)}
                                                </button>
                                                {hasItems ? (
                                                    <span className="font-bold text-sm text-primary mr-1">{formatCurrency(catAmount)}</span>
                                                ) : (
                                                    <Controller
                                                        key={cat.key}
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        control={form.control as any}
                                                        name={cat.key as keyof FormData}
                                                        render={({ field }) => (
                                                            <div className="relative w-32">
                                                                <IndianRupee className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                                <input type="number" min="0" className="h-8 w-full bg-muted/50 border border-border rounded-md pl-7 pr-2 text-sm text-right" value={Number(field.value) || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                        )}
                                                    />
                                                )}
                                                <button type="button" onClick={() => openDialog(cat)} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all" title={`Add ${cat.label} item`}>
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            {isExpanded && hasItems && (
                                                <div className="mx-5 mb-2 space-y-1.5">
                                                    {items.map(item => (
                                                        <div key={item.id} className="group/item flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 border border-border/50">
                                                            <div className="flex items-start gap-2 min-w-0">
                                                                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10"><FileText className="h-2.5 w-2.5 text-primary" /></div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        {item.date && <span className="text-[10px] text-muted-foreground">{item.date}</span>}
                                                                        {item.notes && <span className="text-[10px] text-muted-foreground italic truncate">{item.notes}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                <span className="text-xs font-bold text-primary">{formatCurrency(item.amount)}</span>
                                                                <button type="button" onClick={() => removeBreakdownItem(cat.key, item.id)} className="opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 flex h-6 w-6 items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer total */}
                            <div className="border-t-2 border-primary/20 px-5 py-4 flex justify-between items-center bg-primary/5">
                                <div>
                                    <span className="font-bold text-foreground">Total Investment</span>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Purchase Price + all reconditioning</p>
                                </div>
                                <span className="text-xl font-bold text-primary">{formatCurrency(totalInvestment)}</span>
                            </div>
                        </div>
                    )}

                    {/* ── Add Breakdown Item Dialog ── */}
                    <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog(d => ({ ...d, open: false }))}>
                        <DialogContent className="w-[96vw] max-w-sm p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border">
                            <div className="glass-header relative p-5">
                                <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-lg"><Wrench className="h-4 w-4 text-white" /></div>
                                    <div>
                                        <DialogTitle className="text-base font-bold text-foreground">{dialog.catIcon} Add {dialog.catLabel} Item</DialogTitle>
                                        <DialogDescription className="text-xs text-muted-foreground">Add a detailed breakdown entry</DialogDescription>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">Item Name <span className="text-destructive">*</span></label>
                                    <Input placeholder="e.g. Brake pads" className="h-9 bg-muted/50 border-border text-sm mt-1.5" value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))} onKeyDown={e => e.key === "Enter" && addBreakdownItem()} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">Amount (₹) <span className="text-destructive">*</span></label>
                                    <div className="relative mt-1.5"><IndianRupee className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input type="number" min="0" className="h-9 bg-muted/50 border-border pl-7 text-sm" value={newItem.amount} onChange={e => setNewItem(n => ({ ...n, amount: e.target.value }))} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs font-semibold text-foreground">Date</label><Input type="date" className="h-9 bg-muted/50 border-border text-sm mt-1.5" value={newItem.date} onChange={e => setNewItem(n => ({ ...n, date: e.target.value }))} /></div>
                                    <div><label className="text-xs font-semibold text-foreground">Notes</label><Input placeholder="Optional" className="h-9 bg-muted/50 border-border text-sm mt-1.5" value={newItem.notes} onChange={e => setNewItem(n => ({ ...n, notes: e.target.value }))} /></div>
                                </div>
                            </div>
                            <div className="border-t border-border bg-muted/20 p-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialog(d => ({ ...d, open: false }))}>Cancel</Button>
                                <Button type="button" disabled={!newItem.name.trim() || !newItem.amount} onClick={addBreakdownItem} className={cn("text-white", accentColor === "violet" ? "bg-violet-600 hover:bg-violet-700" : "bg-blue-600 hover:bg-blue-700")}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Item</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

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
                            <Button key="next-btn" type="button"
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
                            <Button key="submit-btn" type="button" disabled={isSubmitting}
                                onClick={() => {
                                    setIsSubmitting(true);
                                    form.handleSubmit(
                                        (v) => mutate(v),
                                        () => setIsSubmitting(false)   // re-enable if validation fails
                                    )();
                                }}
                                className={cn("text-white", accentColor === "violet" ? "bg-violet-600 hover:bg-violet-700" : "bg-blue-600 hover:bg-blue-700")}>
                                {isSubmitting ? "Registering..." : "Register Consignment"}
                                {!isSubmitting && <Check className="ml-2 h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default ConsignmentForm;
