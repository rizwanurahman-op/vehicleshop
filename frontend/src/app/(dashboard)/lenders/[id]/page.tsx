import { Metadata } from "next";
import axios from "@config/axios";
import { getToken } from "@/lib/getToken";
import { AxiosError } from "axios";
import { APP_NAME } from "@data";
import { LenderDetail } from "./components";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<ILenderWithSummary>>(`/lenders/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const name = res.data?.data?.name ?? "Lender";
        return { title: `${APP_NAME} | ${name}`, description: `Capital and repayment details for ${name}` };
    } catch {
        return { title: `${APP_NAME} | Lender Details` };
    }
}

const fetchLender = async (id: string): Promise<ILenderWithSummary | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<ILenderWithSummary>>(`/lenders/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data?.data ?? null;
    } catch (error: unknown) {
        const err = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching lender:", err?.message);
        return null;
    }
};

const LenderDetailPage = async ({ params }: Props) => {
    const { id } = await params;
    const initialData = await fetchLender(id);
    return (
        <section className="flex w-full flex-col pb-20 md:pb-4">
            <LenderDetail id={id} initialData={initialData} />
        </section>
    );
};

export default LenderDetailPage;
