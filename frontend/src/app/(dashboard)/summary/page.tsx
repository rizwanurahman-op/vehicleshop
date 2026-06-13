import { Metadata } from "next";
import { APP_NAME } from "@data";
import SummaryClient from "./components/summary-client";
import { serverFetch } from "@/lib/serverFetch";

export const metadata: Metadata = {
    title: `${APP_NAME} | Summary`,
    description: "Lender summary — auto-calculated borrowing, repayment and balance",
};

export default async function SummaryPage() {
    const { data: initialData } = await serverFetch<ILenderSummary[]>("/summary/lenders?page=1&limit=200");
    return <SummaryClient initialData={initialData} />;
}
