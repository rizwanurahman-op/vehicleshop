import { Metadata } from "next";
import { APP_NAME } from "@data";
import { InvestmentList } from "./components";
import { serverFetch } from "@/lib/serverFetch";

export const metadata: Metadata = {
    title: `${APP_NAME} | Investments`,
    description: "Investment register — money received from lenders",
};

export default async function InvestmentsPage() {
    const { data: initialData } = await serverFetch<IInvestment[]>("/investments?page=1&limit=50");
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <InvestmentList initialData={initialData} />
        </section>
    );
}
