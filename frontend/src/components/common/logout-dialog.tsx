"use client";

import { useState } from "react";
import axios from "@config/axios";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Loader2, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { useSessionStore } from "@stores/session";
import { clearClientSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

type LogoutDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const LogoutDialog = ({ open, onOpenChange }: LogoutDialogProps) => {
    const [isPending, setIsPending] = useState(false);
    const clearSession = useSessionStore(s => s.clearSession);
    const router = useRouter();

    const handleLogout = async () => {
        setIsPending(true);
        const toastId = toast.loading("Signing out…", { description: "Please wait." });
        try {
            await axios.post("/auth/logout");
        } catch (error: unknown) {
            const err = error as AxiosError;
            console.error("Logout error:", err.message);
        } finally {
            clearClientSession();
            Cookies.remove("vb_access_token");
            clearSession();
            toast.success("Signed out!", { id: toastId, description: "You have been signed out successfully." });
            router.push("/auth/login");
            setIsPending(false);
            onOpenChange(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-card border-border sm:max-w-md">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <LogOut className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">Sign out?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                            You will be redirected to the login page. Your session will be terminated.
                        </AlertDialogDescription>
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="cursor-pointer">
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button variant="destructive" disabled={isPending} onClick={handleLogout} className="cursor-pointer">
                        {isPending ? (
                            <><Loader2 size={16} className="mr-2 animate-spin" /> Signing out…</>
                        ) : (
                            <><LogOut size={16} className="mr-2" /> Sign out</>
                        )}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default LogoutDialog;
