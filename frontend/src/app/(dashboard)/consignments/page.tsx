import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ConsignmentList } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Consignment Inventory` };

const fetchConsignments = async (): Promise<ConsignmentPaginatedData | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<ConsignmentPaginatedData>>("/consignments", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 20 },
        });
        return res.data?.data ?? null;
    } catch (error: unknown) {
        const err = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching consignments:", err?.message);
        return null;
    }
};

const ConsignmentsPage = async () => {
    const initialData = await fetchConsignments();
    return (
        <section className="flex w-full flex-col pb-2">
            <ConsignmentList initialData={initialData} />
        </section>
    );
};

export default ConsignmentsPage;
