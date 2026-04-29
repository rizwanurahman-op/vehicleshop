"use client";

import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, X, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { formatINR } from "@/lib/currency";

type Props = { repayment: IRepayment; open: boolean; onOpenChange: (open: boolean) => void };

const DeleteRepaymentDialog = ({ repayment, open, onOpenChange }: Props) => {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            setToastId(toast.loading("Deleting…", { description: "Removing repayment record." }));
            return await axios.delete(`/repayments/${repayment._id}`);
        },
        onSuccess: () => {
            toast.success("Deleted!", { id: toastId });
            queryClient.invalidateQueries({ queryKey: ["repayments"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message });
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl p-6 bg-card border-border sm:w-full">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-lg font-bold">Delete Repayment?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                            This will permanently delete repayment of{" "}
                            <strong className="text-foreground">{formatINR(repayment.amountPaid)}</strong>{" "}
                            ({repayment.repaymentId}). This action cannot be undone.
                        </AlertDialogDescription>
                    </div>
                </div>
                <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button variant="destructive" disabled={isPending} onClick={() => mutate()} className="cursor-pointer">
                        {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Deleting…</> : <><Trash2 size={16} className="mr-2" /> Delete</>}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteRepaymentDialog;
