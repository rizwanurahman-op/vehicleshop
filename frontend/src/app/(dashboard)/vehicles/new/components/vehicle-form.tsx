"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { formatApiErrors } from "@lib/formatApiErrors";
import { createVehicleSchema } from "@schemas/vehicle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bike, Car, ChevronRight, ChevronLeft, ChevronDown, Check, Loader2, IndianRupee, Calendar, FileText, Plus, Trash2, Wrench, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { VEHICLE_MAKES_2W, VEHICLE_MAKES_4W, COST_CATEGORIES, NOC_STATUSES } from "@data/vehicle-constants";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@lib/currency";

type FormData = z.infer<typeof createVehicleSchema>;

const STEPS = [
    { id: 1, label: "Vehicle Details", icon: Car },
    { id: 2, label: "Purchase & Payment", icon: IndianRupee },
    { id: 3, label: "Reconditioning Costs", icon: FileText },
    { id: 4, label: "Review & Submit", icon: Check },
];

type BreakdownItem = { id: string; name: string; amount: number; date: string; notes: string };
type BreakdownMap = Record<string, BreakdownItem[]>;

const VehicleForm = () => {
    const [step, setStep] = useState(1);
    const [isPending, setIsPending] = useState(false);
    const [breakdownMap, setBreakdownMap] = useState<BreakdownMap>({});
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
    const [dialog, setDialog] = useState<{ open: boolean; catKey: string; catLabel: string; catIcon: string }>({
        open: false, catKey: "", catLabel: "", catIcon: "",
    });
    const [newItem, setNewItem] = useState({ name: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    const [openMake, setOpenMake] = useState(false);
    const [makeSearchValue, setMakeSearchValue] = useState("");
    const router = useRouter();
    const queryClient = useQueryClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<FormData, any, FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createVehicleSchema) as any,
        defaultValues: {
            vehicleType: "two_wheeler",
            make: "",
            model: "",
            year: null,
            registrationNo: "",
            color: "",
            engineNo: "",
            chassisNo: "",
            purchasedFrom: "",
            purchasedFromPhone: "",
            datePurchased: new Date().toISOString().split("T")[0],
            purchasePrice: 0,
            fundingSource: "own",
            travelCost: 0, workshopRepairCost: 0, sparePartsAccessories: 0,
            alignmentWork: 0, paintingPolishingCost: 0, washingDetailingCost: 0,
            fuelCost: 0, paperworkTaxInsurance: 0, commission: 0, otherExpenses: 0,
            nocStatus: "not_applicable",
            remarks: "",
        },
    });

    // Use watch() for ALL values so the Review step is always reactive
    const watched = form.watch();
    const vehicleType = watched.vehicleType;
    const purchasePrice = watched.purchasePrice || 0;
    const costs = COST_CATEGORIES.map((c) => (watched[c.key as keyof FormData] as number) || 0);
    const totalCosts = costs.reduce((a, b) => a + b, 0);
    const totalInvestment = purchasePrice + totalCosts;
    const makes = vehicleType === "two_wheeler" ? VEHICLE_MAKES_2W : VEHICLE_MAKES_4W;

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

    const onSubmit = async (values: FormData) => {
        setIsPending(true);
        const tid = toast.loading("Creating vehicle...", { description: "Saving purchase record" });
        try {
            const res = await axios.post<ApiResponse<IVehicle>>("/vehicles", { ...values, purchasePrice: Number(values.purchasePrice) });
            const vehicleId = res.data.data?._id;
            if (vehicleId) {
                for (const cat of COST_CATEGORIES) {
                    for (const item of (breakdownMap[cat.key] || [])) {
                        try {
                            await axios.post(`/vehicles/${vehicleId}/costs/breakdown`, {
                                category: cat.category, name: item.name, amount: item.amount,
                                date: item.date || undefined, notes: item.notes || undefined,
                            });
                        } catch { /* non-critical */ }
                    }
                }
            }
            toast.success("Vehicle added!", { id: tid, description: `${values.make} ${values.model} successfully registered` });
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
            router.push("/vehicles");
        } catch (error: unknown) {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(errorData?.errors) || errorData?.message || "Failed to create vehicle" });
        } finally {
            setIsPending(false);
        }
    };

    const nextStep = async () => {
        const fieldsToValidate: (keyof FormData)[][] = [
            ["vehicleType", "make", "model", "registrationNo", "purchasedFrom"],
            ["datePurchased", "purchasePrice"],
            [],
        ];
        if (step < 4) {
            const fields = fieldsToValidate[step - 1];
            if (fields.length > 0) {
                const valid = await form.trigger(fields);
                if (!valid) return;
            }
            setStep((s) => s + 1);
        }
    };

    const formatINR = (v: number) => v ? v.toLocaleString("en-IN") : "0";

    return (
        <div className="mx-auto max-w-3xl pb-10">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
                    <Car className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Add Vehicle Purchase</h1>
                    <p className="text-sm text-muted-foreground">Step {step} of {STEPS.length} — {STEPS[step - 1]?.label}</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="mb-8 flex items-center gap-1">
                {STEPS.map((s, i) => (
                    <div key={s.id} className="flex flex-1 items-center">
                        {/* MUST be type="button" — default is type="submit" which would submit the form */}
                        <button
                            type="button"
                            onClick={() => step > s.id && setStep(s.id)}
                            className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                                step === s.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" :
                                    step > s.id ? "bg-emerald-500 text-white cursor-pointer" :
                                        "bg-muted/60 text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                        </button>
                        {i < STEPS.length - 1 && (
                            <div className={cn("h-0.5 flex-1 transition-colors", step > s.id ? "bg-emerald-500" : "bg-muted/60")} />
                        )}
                    </div>
                ))}
            </div>

            <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

                        {/* ───── STEP 1: Vehicle Details ───── */}
                        {step === 1 && (
                            <div className="p-6 space-y-5">
                                <div className="glass-header -mx-6 -mt-6 mb-6 px-6 py-4">
                                    <h2 className="font-bold text-foreground text-lg">Vehicle Identity</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Basic information about the vehicle</p>
                                </div>

                                {/* Vehicle Type Toggle */}
                                <FormField control={form.control} name="vehicleType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground">Vehicle Type <span className="text-destructive">*</span></FormLabel>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[{ v: "two_wheeler", label: "Two Wheeler", Icon: Bike }, { v: "four_wheeler", label: "Four Wheeler", Icon: Car }].map(({ v, label, Icon }) => (
                                                <button key={v} type="button" onClick={() => field.onChange(v)}
                                                    className={cn("flex items-center gap-3 rounded-xl border-2 p-4 transition-all text-left", field.value === v ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/40")}>
                                                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", field.value === v ? "bg-gradient-brand" : "bg-muted/60")}>
                                                        <Icon className={cn("h-5 w-5", field.value === v ? "text-white" : "text-muted-foreground")} />
                                                    </div>
                                                    <span className={cn("font-semibold text-sm", field.value === v ? "text-primary" : "text-muted-foreground")}>{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField control={form.control} name="make" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="font-semibold text-foreground">Vehicle Brand / Make <span className="text-destructive">*</span></FormLabel>
                                            <Popover open={openMake} onOpenChange={setOpenMake}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={openMake}
                                                            className={cn(
                                                                "h-10 w-full justify-between bg-muted/50 border-border text-left font-normal hover:bg-muted/70 hover:text-foreground",
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
                                    )} />
                                    <FormField control={form.control} name="model" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Model <span className="text-destructive">*</span></FormLabel>
                                            <FormControl><Input placeholder="e.g. Access 2022, CRYSTA 2018" className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="year" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Year</FormLabel>
                                            <FormControl><Input type="number" placeholder="2022" className="h-10 bg-muted/50 border-border" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="registrationNo" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Registration No <span className="text-destructive">*</span></FormLabel>
                                            <FormControl><Input placeholder="KL04AP8169" className="h-10 bg-muted/50 border-border uppercase" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Color</FormLabel>
                                            <FormControl><Input placeholder="Red, Blue, White..." className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="purchasedFrom" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Purchased From <span className="text-destructive">*</span></FormLabel>
                                            <FormControl><Input placeholder="Seller name" className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="purchasedFromPhone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Seller Phone</FormLabel>
                                            <FormControl><Input placeholder="+91 9876543210" className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="engineNo" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Engine No</FormLabel>
                                            <FormControl><Input placeholder="Optional" className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="chassisNo" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Chassis No</FormLabel>
                                            <FormControl><Input placeholder="Optional" className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        )}

                        {/* ───── STEP 2: Purchase & Payment ───── */}
                        {step === 2 && (
                            <div className="p-6 space-y-5">
                                <div className="glass-header -mx-6 -mt-6 mb-6 px-6 py-4">
                                    <h2 className="font-bold text-foreground text-lg">Purchase Details</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Date, price and payment information</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField control={form.control} name="datePurchased" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Date Purchased <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input type="date" className="h-10 bg-muted/50 border-border pl-9" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Purchase Price (₹) <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input type="number" min="0" step="1" className="h-10 bg-muted/50 border-border pl-9" value={field.value || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                {vehicleType === "four_wheeler" && (
                                    <FormField control={form.control} name="nocStatus" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">NOC Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-10 bg-muted/50 border-border"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{NOC_STATUSES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                )}
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground">Remarks</FormLabel>
                                        <FormControl><Textarea placeholder="Any notes about this purchase..." rows={2} className="resize-none bg-muted/50 border-border" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                {/* Summary */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Purchase Price</p>
                                        <p className="text-base font-bold text-foreground">₹{formatINR(purchasePrice)}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reconditioning</p>
                                        <p className="text-base font-bold text-orange-400">+₹{formatINR(totalCosts)}</p>
                                    </div>
                                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Total Investment</p>
                                        <p className="text-base font-bold text-primary">₹{formatINR(totalInvestment)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ───── STEP 3: Reconditioning Costs ───── */}
                        {step === 3 && (
                            <div className="p-6 space-y-5">
                                <div className="glass-header -mx-6 -mt-6 mb-6 px-6 py-4">
                                    <h2 className="font-bold text-foreground text-lg">Reconditioning Costs</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Tap ✏️ to enter amount · Tap + to add named breakdown items</p>
                                </div>
                                {/* Cost rows */}
                                <div className="rounded-xl border border-border bg-card overflow-hidden">
                                    <div className="divide-y divide-border">
                                        {COST_CATEGORIES.map((cat) => {
                                            const items = breakdownMap[cat.key] || [];
                                            const hasItems = items.length > 0;
                                            const isExpanded = expandedCats[cat.key];
                                            const catAmount = (watched[cat.key as keyof FormData] as number) || 0;
                                            return (
                                                <div key={cat.key}>
                                                    <div className={cn("group flex items-center gap-2 px-5 py-3 hover:bg-muted/20 transition-colors", catAmount === 0 && !hasItems ? "opacity-60" : "")}>
                                                        <button type="button" onClick={() => hasItems && setExpandedCats(e => ({ ...e, [cat.key]: !isExpanded }))} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                                            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                                                <span className="text-base">{cat.icon}</span>
                                                                <span className="truncate">{cat.label}</span>
                                                            </span>
                                                            {hasItems && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{items.length}</span>}
                                                            {hasItems && (isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)}
                                                        </button>
                                                        {hasItems ? (
                                                            <span className="font-bold text-sm text-primary mr-1">{formatCurrency(catAmount)}</span>
                                                        ) : (
                                                            <Controller
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                control={form.control as any}
                                                                name={cat.key}
                                                                render={({ field }) => (
                                                                    <div className="relative w-32">
                                                                        <IndianRupee className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                                        <Input type="number" min="0" step="1" className="h-8 bg-muted/50 border-border pl-7 text-sm text-right" value={(field.value as number) || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
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
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Purchase Price + all reconditioning costs</p>
                                        </div>
                                        <span className="text-2xl font-bold text-primary">₹{formatINR(totalInvestment)}</span>
                                    </div>
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
                                        <Input placeholder="e.g. Engine repair" className="h-9 bg-muted/50 border-border text-sm mt-1.5" value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))} onKeyDown={e => e.key === "Enter" && addBreakdownItem()} />
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
                                    <Button type="button" disabled={!newItem.name.trim() || !newItem.amount} onClick={addBreakdownItem} className="bg-gradient-brand text-white hover:opacity-90"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Item</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* ───── STEP 4: Review & Submit ───── */}
                        {step === 4 && (
                            <div className="p-6 space-y-4">
                                <div className="glass-header -mx-6 -mt-6 mb-6 px-6 py-4">
                                    <h2 className="font-bold text-foreground text-lg">Review & Confirm</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Double-check everything before saving</p>
                                </div>
                                {/* Use watched values (reactive) — NOT form.getValues() which is a one-time snapshot */}
                                {[
                                    { label: "Vehicle", value: `${watched.vehicleType === "two_wheeler" ? "🏍️" : "🚗"} ${watched.make} ${watched.model}${watched.year ? ` (${watched.year})` : ""}` },
                                    { label: "Registration No", value: watched.registrationNo },
                                    { label: "Purchased From", value: watched.purchasedFrom + (watched.purchasedFromPhone ? ` • ${watched.purchasedFromPhone}` : "") },
                                    { label: "Date Purchased", value: watched.datePurchased },
                                    { label: "Purchase Price", value: `₹${formatINR(purchasePrice)}` },
                                    { label: "Total Investment", value: `₹${formatINR(totalInvestment)}` },
                                    ...(watched.color ? [{ label: "Color", value: watched.color }] : []),
                                    ...(watched.nocStatus && watched.nocStatus !== "not_applicable" ? [{ label: "NOC Status", value: watched.nocStatus }] : []),
                                    ...(watched.remarks ? [{ label: "Remarks", value: watched.remarks }] : []),
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-2.5 text-sm">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className="font-semibold text-foreground text-right max-w-[60%]">{row.value}</span>
                                    </div>
                                ))}
                                {totalCosts > 0 && (
                                    <div className="rounded-xl border border-border bg-muted/10 p-4">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Reconditioning Costs</p>
                                        {COST_CATEGORIES.filter((c) => ((watched[c.key as keyof FormData] as number) || 0) > 0).map((cat) => (
                                            <div key={cat.key} className="flex justify-between text-sm py-0.5">
                                                <span className="text-muted-foreground">{cat.icon} {cat.label}</span>
                                                <span className="font-medium text-foreground">₹{formatINR((watched[cat.key as keyof FormData] as number) || 0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
                            <Button type="button" variant="outline" onClick={() => step > 1 ? setStep((s) => s - 1) : router.push("/vehicles")} className="border-border">
                                <ChevronLeft className="mr-1.5 h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}
                            </Button>
                            {step < 4 ? (
                                <Button key="next-btn" type="button" onClick={nextStep} className="bg-gradient-brand text-white hover:opacity-90">
                                    Next <ChevronRight className="ml-1.5 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button key="submit-btn" type="button" disabled={isPending} onClick={() => form.handleSubmit(onSubmit)()} className="bg-gradient-brand text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Check className="mr-2 h-4 w-4" /> Add Vehicle</>}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default VehicleForm;
