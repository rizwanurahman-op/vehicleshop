"use client";

import { z } from "zod";
import { useEffect, useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateInvestmentSchema } from "@schemas/investment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, X, Save, Calendar, Loader2, IndianRupee } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODES } from "@data";
import { formatDateInput } from "@/lib/date";

type FormData = z.infer<typeof updateInvestmentSchema>;

type Props = { investment: IInvestment; open: boolean; onOpenChange: (open: boolean) => void };

const UpdateInvestmentDialog = ({ investment, open, onOpenChange }: Props) => {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const form = useForm<FormData>({
        resolver: zodResolver(updateInvestmentSchema),
        defaultValues: {
            date: formatDateInput(investment.date),
            amountReceived: investment.amountReceived,
            mode: investment.mode,
            referenceNo: investment.referenceNo || "",
            notes: investment.notes || "",
        },
    });

    useEffect(() => {
        form.reset({
            date: formatDateInput(investment.date),
            amountReceived: investment.amountReceived,
            mode: investment.mode,
            referenceNo: investment.referenceNo || "",
            notes: investment.notes || "",
        });
    }, [investment, form]);

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: FormData) => {
            setToastId(toast.loading("Saving…", { description: "Updating investment." }));
            return await axios.patch(`/investments/${investment._id}`, values);
        },
        onSuccess: () => {
            toast.success("Updated!", { id: toastId });
            queryClient.invalidateQueries({ queryKey: ["investments"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-md max-h-[90vh] flex flex-col bg-card border-border">
                <div className="glass-header relative p-4 sm:p-6">
                    <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-lg glass-header-icon">
                            <ArrowDownLeft className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg font-bold text-foreground">Edit Investment</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">Update financial entry for {typeof investment.lender === "object" ? investment.lender?.name : investment.lender}</DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form id="update-investment-form" onSubmit={form.handleSubmit(values => mutate(values))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 p-4 sm:p-6">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Date</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Calendar size={16} /></div>
                                                <Input type="date" className="h-10 pl-9 bg-muted/50 border-border" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="amountReceived" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold">Amount (₹)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><IndianRupee size={16} /></div>
                                                    <Input type="number" className="h-10 pl-9 bg-muted/50 border-border" value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="mode" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold">Mode</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-10 bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="referenceNo" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Reference No</FormLabel>
                                        <FormControl><Input className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Notes</FormLabel>
                                        <FormControl><Textarea rows={2} className="resize-none bg-muted/50 border-border" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                        <div className="border-t border-border bg-muted/30 p-4 pt-3 flex justify-end gap-3">
                            <Button disabled={isPending} type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer border-border"><X size={16} className="mr-2" /> Cancel</Button>
                            <Button disabled={isPending} type="submit" className="cursor-pointer bg-gradient-brand text-white hover:opacity-90">
                                {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : <><Save size={16} className="mr-2" /> Save</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateInvestmentDialog;
