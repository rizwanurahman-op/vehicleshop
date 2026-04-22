import { Metadata } from "next";
import { APP_NAME } from "@data";
import axios from "@config/axios";
import { getToken } from "@/lib/getToken";
import { AxiosError } from "axios";
import { LenderList } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Lenders`,
    description: "Manage investor relationships and track capital",
};

const fetchLenders = async (): Promise<ILenderWithSummary[] | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<ILenderWithSummary[]>>("/lenders", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 50, status: "all" },
        });
        return res.data.data ?? null;
    } catch (error: unknown) {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching lenders:", errorData?.message);
        return null;
    }
};

export default async function LendersPage() {
    const initialData = await fetchLenders();
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <LenderList initialData={initialData} />
        </section>
    );
}
