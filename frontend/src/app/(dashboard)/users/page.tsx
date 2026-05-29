import { Metadata } from "next";
import { APP_NAME } from "@data";
import { UsersPageClient } from "./users-page-client";

export const metadata: Metadata = {
    title: `${APP_NAME} | User Management`,
    description: "Manage viewer accounts and user access",
};

export default function UsersPage() {
    return (
        <section className="flex w-full flex-col pb-4">
            <UsersPageClient />
        </section>
    );
}
