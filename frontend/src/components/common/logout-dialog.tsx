"use client";

import { useState } from "react";
import axios from "@config/axios";
import { toast } from "sonner";
import { Loader2, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { useSessionStore } from "@stores/session";
import { clearClientSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

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
            // Best-effort — the backend will revoke the refresh token from the httpOnly cookie.
            // If this fails (network error etc.) we still clear the frontend state.
            await axios.post("/auth/logout");
        } catch {
            // Intentionally swallowed — frontend cleanup always runs
        } finally {
            clearClientSession();   // removes the vb_access_token cookie
            clearSession();         // clears Zustand + localStorage
            onOpenChange(false);
            toast.success("Signed out!", { id: toastId, description: "You have been signed out successfully." });
            // push first, then refresh so Next.js middleware picks up the cleared cookie
            router.push("/auth/login");
            router.refresh();
            setIsPending(false);
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
