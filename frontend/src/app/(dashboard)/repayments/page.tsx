import { Metadata } from "next";
import { APP_NAME } from "@data";
import axios from "@config/axios";
import { getToken } from "@/lib/getToken";
import { AxiosError } from "axios";
import { RepaymentList } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Repayments`,
    description: "Repayment register — money paid back to lenders",
};

const fetchRepayments = async (): Promise<IRepayment[] | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<IRepayment[]>>("/repayments", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 50 },
        });
        return res.data.data ?? null;
    } catch (error: unknown) {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching repayments:", errorData?.message);
        return null;
    }
};

export default async function RepaymentsPage() {
    const initialData = await fetchRepayments();
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <RepaymentList initialData={initialData} />
        </section>
    );
}
