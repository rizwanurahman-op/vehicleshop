import { Metadata } from "next";
import { APP_NAME } from "@data";
import axios from "@config/axios";
import { getToken } from "@/lib/getToken";
import { AxiosError } from "axios";
import SummaryClient from "./components/summary-client";

export const metadata: Metadata = {
    title: `${APP_NAME} | Summary`,
    description: "Lender summary — auto-calculated borrowing, repayment and balance",
};

const fetchSummary = async (): Promise<ILenderSummary[] | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<ILenderSummary[]>>("/summary/lenders", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 200 },
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
    return <SummaryClient initialData={initialData} />;
}
