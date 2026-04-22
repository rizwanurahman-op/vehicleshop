import { Metadata } from "next";
import { APP_NAME } from "@data";
import axios from "@config/axios";
import { getToken } from "@/lib/getToken";
import { AxiosError } from "axios";
import { SummaryTable, SummaryCards, SummaryCharts } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Summary`,
    description: "Lender summary — auto-calculated borrowing, repayment and balance",
};

const fetchSummary = async (): Promise<ILenderSummary[] | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<ILenderSummary[]>>("/summary/lenders", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 100 },
        });
        return res.data.data ?? null;
    } catch (error: unknown) {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching summary:", errorData?.message);
        return null;
    }
};

export default async function SummaryPage() {
    const initialData = await fetchSummary();
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Lender Summary</h1>
                    <p className="text-sm text-muted-foreground">Auto-calculated from investment and repayment records</p>
                </div>
                <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/summary/export/csv`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                    Export CSV
                </a>
            </div>

            <SummaryCards initialData={initialData} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SummaryCharts initialData={initialData} />
            </div>
            <SummaryTable initialData={initialData} />
        </section>
    );
}
