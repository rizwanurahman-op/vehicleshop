import { Suspense } from "react";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ResetPasswordForm } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Reset Password`,
    description: "Set a new password for your VehicleBook account",
};

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}
