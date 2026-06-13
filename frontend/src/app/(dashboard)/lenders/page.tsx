import { Metadata } from "next";
import { APP_NAME } from "@data";
import { LenderList } from "./components";
import { serverFetch } from "@/lib/serverFetch";

export const metadata: Metadata = {
    title: `${APP_NAME} | Lenders`,
    description: "Manage investor relationships and track capital",
};

export default async function LendersPage() {
    const { data: initialData } = await serverFetch<ILenderWithSummary[]>("/lenders?page=1&limit=50&status=all");
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <LenderList initialData={initialData} />
        </section>
    );
}
