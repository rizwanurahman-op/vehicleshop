import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { VehicleOwnerList } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Vehicle Owners` };

const fetchOwners = async (): Promise<VehicleOwnerPaginatedData | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<VehicleOwnerPaginatedData>>("/vehicle-owners", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 50 },
        });
        return res.data?.data ?? null;
    } catch (error: unknown) {
        const err = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching owners:", err?.message);
        return null;
    }
};

const VehicleOwnersPage = async () => {
    const initialData = await fetchOwners();
    return (
        <section className="flex w-full flex-col pb-2">
            <VehicleOwnerList initialData={initialData} />
        </section>
    );
};

export default VehicleOwnersPage;
