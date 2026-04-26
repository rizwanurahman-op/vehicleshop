import { Suspense } from "react";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { LoginForm } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Login`,
    description: "Sign in to your VehicleBook account",
};

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
