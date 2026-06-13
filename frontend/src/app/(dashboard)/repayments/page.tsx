import { Metadata } from "next";
import { APP_NAME } from "@data";
import { RepaymentList } from "./components";
import { serverFetch } from "@/lib/serverFetch";

export const metadata: Metadata = {
    title: `${APP_NAME} | Repayments`,
    description: "Repayment register — money paid back to lenders",
};

export default async function RepaymentsPage() {
    const { data: initialData } = await serverFetch<IRepayment[]>("/repayments?page=1&limit=50");
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <RepaymentList initialData={initialData} />
        </section>
    );
}
