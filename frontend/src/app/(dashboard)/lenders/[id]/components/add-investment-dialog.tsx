"use client";

import { z } from "zod";
import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { createInvestmentSchema } from "@schemas/investment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, X, Plus, Calendar, Loader2, IndianRupee, Sparkles } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODES } from "@data";

// Use the same schema but we'll inject the lender ID manually
type FormData = Omit<z.infer<typeof createInvestmentSchema>, "lender">;

interface AddInvestmentDialogProps {
    lenderId: string; // MongoDB _id of the lender
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddInvestmentDialog({ lenderId, open, onOpenChange }: AddInvestmentDialogProps) {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const qc = useQueryClient();

    const form = useForm<FormData>({
        resolver: zodResolver(createInvestmentSchema.omit({ lender: true })),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            amountReceived: 0,
            mode: "Cash",
            referenceNo: "",
            notes: "",
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: FormData) => {
            setToastId(toast.loading("Recording…", { description: "Saving investment record." }));
            return await axios.post("/investments", { ...values, lender: lenderId });
        },
        onSuccess: () => {
            toast.success("Recorded!", { id: toastId, description: "Investment has been recorded." });
            qc.invalidateQueries({ queryKey: ["lender-investments", lenderId] });
            qc.invalidateQueries({ queryKey: ["lender", lenderId] });
            qc.invalidateQueries({ queryKey: ["lender-stats"] });
            qc.invalidateQueries({ queryKey: ["investments"] });
            qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
            form.reset({
                date: new Date().toISOString().split("T")[0],
                amountReceived: 0,
                mode: "Cash",
                referenceNo: "",
                notes: "",
            });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message || "Failed!" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onOpenAutoFocus={e => e.preventDefault()}
                className="w-[96vw] max-w-lg p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full"
            >
                {/* Header */}
                <div className="glass-header relative p-4 sm:p-6">
                    <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-lg glass-header-icon">
                            <ArrowDownLeft className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-bold tracking-widest text-primary uppercase">New</span>
                            </div>
                            <DialogTitle className="m-0 text-lg font-bold text-foreground sm:text-xl">
                                Record Investment
                            </DialogTitle>
                            <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                                Capital received from this lender
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form
                        id="add-investment-form"
                        onSubmit={form.handleSubmit(values => mutate(values))}
                        className="flex flex-col flex-1 overflow-hidden min-h-0"
                    >
                        <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">

                                {/* Date */}
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Date <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Calendar size={16} /></div>
                                                <Input type="date" className="h-10 pl-9 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Amount + Mode */}
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="amountReceived" render={({ field }) => (
                                        <FormItem className="col-span-2 sm:col-span-1">
                                            <FormLabel className="font-semibold">Amount (₹) <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><IndianRupee size={16} /></div>
                                                    <Input
                                                        type="number" min="0" step="1"
                                                        className="h-10 pl-9 bg-muted/50 border-border focus-visible:border-primary"
                                                        value={field.value || ""}
                                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="mode" render={({ field }) => (
                                        <FormItem className="col-span-2 sm:col-span-1">
                                            <FormLabel className="font-semibold">Mode <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-10 bg-muted/50 border-border">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Reference No */}
                                <FormField control={form.control} name="referenceNo" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Reference No</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Cheque / UPI ref number" className="h-10 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Notes */}
                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Optional notes" rows={2} className="resize-none bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border bg-muted/30 p-4 pt-3 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button disabled={isPending} type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                                    <X size={16} className="mr-2" /> Cancel
                                </Button>
                                <Button disabled={isPending} type="submit" className="cursor-pointer bg-gradient-brand text-white hover:opacity-90">
                                    {isPending
                                        ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</>
                                        : <><Plus size={16} className="mr-2" /> Record</>}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
