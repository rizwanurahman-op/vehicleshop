import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { SalesList } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Sales Register` };

const fetchSales = async (): Promise<SalesPaginatedData | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<SalesPaginatedData>>("/sales", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 20 },
        });
        return res.data?.data ?? null;
    } catch (error: unknown) {
        const err = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching sales:", err?.message);
        return null;
    }
};

const SalesPage = async () => {
    const initialData = await fetchSales();
    return (
        <section className="flex w-full flex-col pb-2">
            <SalesList initialData={initialData} />
        </section>
    );
};

export default SalesPage;
