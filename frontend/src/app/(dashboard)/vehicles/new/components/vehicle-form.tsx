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
import { Bike, Car, ChevronRight, ChevronLeft, Check, Loader2, Users, IndianRupee, Calendar, FileText } from "lucide-react";
import { VEHICLE_MAKES_2W, VEHICLE_MAKES_4W, COST_CATEGORIES, PURCHASE_PAYMENT_MODES, FUNDING_SOURCES, NOC_STATUSES } from "@data/vehicle-constants";

type FormData = z.infer<typeof createVehicleSchema>;

const STEPS = [
    { id: 1, label: "Vehicle Details", icon: Car },
    { id: 2, label: "Purchase & Payment", icon: IndianRupee },
    { id: 3, label: "Reconditioning Costs", icon: FileText },
    { id: 4, label: "Funding Source", icon: Users },
    { id: 5, label: "Review & Submit", icon: Check },
];

const VehicleForm = () => {
    const [step, setStep] = useState(1);
    const [isPending, setIsPending] = useState(false);
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

    const vehicleType = form.watch("vehicleType");
    const purchasePrice = form.watch("purchasePrice") || 0;
    const costs = COST_CATEGORIES.map((c) => form.watch(c.key as keyof FormData) as number || 0);
    const totalCosts = costs.reduce((a, b) => a + b, 0);
    const totalInvestment = purchasePrice + totalCosts;
    const makes = vehicleType === "two_wheeler" ? VEHICLE_MAKES_2W : VEHICLE_MAKES_4W;

    const onSubmit = async (values: FormData) => {
        setIsPending(true);
        const tid = toast.loading("Creating vehicle...", { description: "Saving purchase record" });
        try {
            await axios.post("/vehicles", { ...values, purchasePrice: Number(values.purchasePrice) });
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
            ["fundingSource"],
        ];
        if (step < 5) {
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
                        <button
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
                        {!form.watch("vehicleType") || i < STEPS.length - 1 && (
                            <div className={cn("h-0.5 flex-1 transition-colors", step > s.id ? "bg-emerald-500" : "bg-muted/60")} />
                        )}
                    </div>
                ))}
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
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
                                        <div className="grid grid-cols-2 gap-3">
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
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">Make <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 bg-muted/50 border-border"><SelectValue placeholder="Select make" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>{makes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                            </Select>
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
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                                    <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1">Purchase Price</p>
                                    <p className="text-2xl font-bold text-primary">₹{formatINR(purchasePrice)}</p>
                                </div>
                            </div>
                        )}

                        {/* ───── STEP 3: Reconditioning Costs ───── */}
                        {step === 3 && (
                            <div className="p-6 space-y-5">
                                <div className="glass-header -mx-6 -mt-6 mb-6 px-6 py-4">
                                    <h2 className="font-bold text-foreground text-lg">Reconditioning Costs</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">All 10 cost categories (optional)</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {COST_CATEGORIES.map((cat) => (
                                        <div key={cat.key}>
                                            <label className="mb-1.5 block text-xs font-semibold text-foreground">{cat.icon} {cat.label}</label>
                                            <Controller
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                control={form.control as any}
                                                name={cat.key}
                                                render={({ field }) => (
                                                    <div className="relative">
                                                        <IndianRupee className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                        <Input type="number" min="0" step="1" className="h-9 bg-muted/50 border-border pl-8 text-sm" value={(field.value as number) || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* Investment Summary */}
                                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Purchase Price</span>
                                        <span>₹{formatINR(purchasePrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Total Reconditioning</span>
                                        <span>₹{formatINR(totalCosts)}</span>
                                    </div>
                                    <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                                        <span>Total Investment</span>
                                        <span className="text-primary">₹{formatINR(totalInvestment)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ───── STEP 4: Funding Source ───── */}
                        {step === 4 && (
                            <div className="p-6 space-y-5">
                                <div className="glass-header -mx-6 -mt-6 mb-6 px-6 py-4">
                                    <h2 className="font-bold text-foreground text-lg">Funding Source</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">How was this purchase funded?</p>
                                </div>
                                <FormField control={form.control} name="fundingSource" render={({ field }) => (
                                    <FormItem>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            {FUNDING_SOURCES.map((fs) => (
                                                <button key={fs.value} type="button" onClick={() => field.onChange(fs.value)}
                                                    className={cn("rounded-xl border-2 p-4 text-left transition-all", field.value === fs.value ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/40")}>
                                                    <div className="text-2xl mb-2">{fs.icon}</div>
                                                    <p className={cn("font-bold text-sm", field.value === fs.value ? "text-primary" : "text-foreground")}>{fs.label}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{fs.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {form.watch("fundingSource") !== "own" && (
                                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-400">
                                        ℹ️ Investor funding details can be added after saving the vehicle from the vehicle detail page.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ───── STEP 5: Review & Submit ───── */}
                        {step === 5 && (
                            <div className="p-6 space-y-4">
                                <div className="glass-header -mx-6 -mt-6 mb-6 px-6 py-4">
                                    <h2 className="font-bold text-foreground text-lg">Review & Confirm</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Double-check everything before saving</p>
                                </div>
                                {[
                                    { label: "Vehicle", value: `${form.getValues("vehicleType") === "two_wheeler" ? "🏍️" : "🚗"} ${form.getValues("make")} ${form.getValues("model")}${form.getValues("year") ? ` (${form.getValues("year")})` : ""}` },
                                    { label: "Registration No", value: form.getValues("registrationNo") },
                                    { label: "Purchased From", value: form.getValues("purchasedFrom") + (form.getValues("purchasedFromPhone") ? ` • ${form.getValues("purchasedFromPhone")}` : "") },
                                    { label: "Date Purchased", value: form.getValues("datePurchased") },
                                    { label: "Purchase Price", value: `₹${formatINR(purchasePrice)}` },
                                    { label: "Total Investment", value: `₹${formatINR(totalInvestment)}` },
                                    { label: "Funding Source", value: FUNDING_SOURCES.find((f) => f.value === form.getValues("fundingSource"))?.label || "-" },
                                    ...(form.getValues("color") ? [{ label: "Color", value: form.getValues("color") as string }] : []),
                                    ...(form.getValues("remarks") ? [{ label: "Remarks", value: form.getValues("remarks") as string }] : []),
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-2.5 text-sm">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className="font-semibold text-foreground text-right max-w-[60%]">{row.value}</span>
                                    </div>
                                ))}
                                {totalCosts > 0 && (
                                    <div className="rounded-xl border border-border bg-muted/10 p-4">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Reconditioning Costs</p>
                                        {COST_CATEGORIES.filter((c) => (form.getValues(c.key as keyof FormData) as number) > 0).map((cat) => (
                                            <div key={cat.key} className="flex justify-between text-sm py-0.5">
                                                <span className="text-muted-foreground">{cat.icon} {cat.label}</span>
                                                <span className="font-medium text-foreground">₹{formatINR(form.getValues(cat.key as keyof FormData) as number)}</span>
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
                            {step < 5 ? (
                                <Button type="button" onClick={nextStep} className="bg-gradient-brand text-white hover:opacity-90">
                                    Next <ChevronRight className="ml-1.5 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white hover:opacity-90">
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
