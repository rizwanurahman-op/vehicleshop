"use client";

import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ToggleLeft, X, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

type DeleteLenderDialogProps = {
    lender: ILenderWithSummary;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const DeleteLenderDialog = ({ lender, open, onOpenChange }: DeleteLenderDialogProps) => {
    const [deleteToast, setDeleteToast] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const deleteLenderRequest = async () => {
        setDeleteToast(toast.loading("Deactivating…", { description: "Please wait." }));
        return await axios.delete(`/lenders/${lender._id}`);
    };

    const { mutate: deactivateLender, isPending } = useMutation({
        mutationFn: deleteLenderRequest,
        onSuccess: () => {
            toast.success("Deactivated!", { id: deleteToast, description: `${lender.name} has been deactivated.` });
            queryClient.invalidateQueries({ queryKey: ["lenders"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            const errorMessage = formatApiErrors(errorData?.errors) || errorData?.message || "Failed to deactivate!";
            toast.error("Error!", { id: deleteToast, description: errorMessage });
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl p-6 bg-card border-border sm:w-full">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">
                            Deactivate &ldquo;{lender.name}&rdquo;?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                            This lender will be marked as inactive. All investments and repayments linked to this lender will remain intact and can be reactivated later.
                        </AlertDialogDescription>
                    </div>
                </div>
                <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button
                        disabled={isPending}
                        onClick={() => deactivateLender()}
                        className="cursor-pointer bg-gradient-warning text-white hover:opacity-90"
                    >
                        {isPending ? (
                            <><Loader2 size={16} className="mr-2 animate-spin" /> Deactivating…</>
                        ) : (
                            <><ToggleLeft size={16} className="mr-2" /> Deactivate</>
                        )}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteLenderDialog;
