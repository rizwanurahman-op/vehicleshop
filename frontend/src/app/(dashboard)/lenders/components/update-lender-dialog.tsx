"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateLenderSchema } from "@schemas/lender";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, X, Save, Phone, MapPin, FileText, Loader2 } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type FormData = z.infer<typeof updateLenderSchema>;

type UpdateLenderDialogProps = {
    lender: ILenderWithSummary;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const UpdateLenderDialog = ({ lender, open, onOpenChange }: UpdateLenderDialogProps) => {
    const [editToast, setEditToast] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const form = useForm<FormData>({
        resolver: zodResolver(updateLenderSchema),
        defaultValues: { name: lender.name, phone: lender.phone || "", address: lender.address || "", remarks: lender.remarks || "" },
    });

    useEffect(() => {
        form.reset({ name: lender.name, phone: lender.phone || "", address: lender.address || "", remarks: lender.remarks || "" });
    }, [lender, form]);

    const updateLenderRequest = async (values: FormData) => {
        setEditToast(toast.loading("Saving…", { description: "Updating lender details." }));
        return await axios.patch(`/lenders/${lender._id}`, values);
    };

    const { mutate, isPending } = useMutation({
        mutationFn: updateLenderRequest,
        onSuccess: () => {
            toast.success("Updated!", { id: editToast, description: "Lender details updated." });
            queryClient.invalidateQueries({ queryKey: ["lenders"] });
            queryClient.invalidateQueries({ queryKey: ["lender", lender._id] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            const fieldErrors = formatApiErrors(errorData?.errors);
            toast.error("Error!", { id: editToast, description: fieldErrors || errorData?.message || "Update failed!" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent onOpenAutoFocus={e => e.preventDefault()} className={cn("overflow-hidden p-0 sm:max-w-lg max-h-[90vh] flex flex-col", "bg-card border-border")}>
                <div className="glass-header relative p-4 sm:p-6">
                    <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-lg glass-header-icon">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg font-bold text-foreground">Edit Lender</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">Update details for {lender.name}</DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form id="update-lender-form" onSubmit={form.handleSubmit(values => mutate(values))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Users size={18} /></div>
                                                <Input className="h-10 pl-10 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Phone</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Phone size={18} /></div>
                                                <Input className="h-10 pl-10 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Address</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-3 left-3"><MapPin size={18} /></div>
                                                <Textarea rows={2} className="resize-none pt-3 pl-10 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Remarks</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-3 left-3"><FileText size={18} /></div>
                                                <Textarea rows={2} className="resize-none pt-3 pl-10 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                        <div className="border-t border-border bg-muted/30 p-4 pt-3">
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                                <Button disabled={isPending} type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                                    <X size={18} className="mr-2" /> Cancel
                                </Button>
                                <Button disabled={isPending} type="submit" form="update-lender-form" className="cursor-pointer bg-gradient-brand text-white hover:opacity-90">
                                    {isPending ? <><Loader2 size={18} className="mr-2 animate-spin" /> Saving…</> : <><Save size={18} className="mr-2" /> Save Changes</>}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateLenderDialog;
