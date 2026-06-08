import { Suspense } from "react";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ForgotPasswordForm } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Forgot Password`,
    description: "Reset your VehicleBook account password",
};

export default function ForgotPasswordPage() {
    return (
        <Suspense>
            <ForgotPasswordForm />
        </Suspense>
    );
}
