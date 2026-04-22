import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { VehicleList } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Vehicle Inventory` };

const fetchVehicles = async (): Promise<VehiclePaginatedData | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<VehiclePaginatedData>>("/vehicles", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 15 },
        });
        return res.data?.data ?? null;
    } catch (error: unknown) {
        const err = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching vehicles:", err?.message);
        return null;
    }
};

const VehiclesPage = async () => {
    const initialData = await fetchVehicles();
    return (
        <section className="flex w-full flex-col pb-2">
            <VehicleList initialData={initialData} />
        </section>
    );
};

export default VehiclesPage;
