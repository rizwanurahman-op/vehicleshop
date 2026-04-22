import { Metadata } from "next";
import { APP_NAME } from "@data";
import axios from "@config/axios";
import { getToken } from "@/lib/getToken";
import { AxiosError } from "axios";
import { InvestmentList } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Investments`,
    description: "Investment register — money received from lenders",
};

const fetchInvestments = async (): Promise<IInvestment[] | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<IInvestment[]>>("/investments", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 50 },
        });
        return res.data.data ?? null;
    } catch (error: unknown) {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching investments:", errorData?.message);
        return null;
    }
};

export default async function InvestmentsPage() {
    const initialData = await fetchInvestments();
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <InvestmentList initialData={initialData} />
        </section>
    );
}
