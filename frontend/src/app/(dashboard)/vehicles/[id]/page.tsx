import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { VehicleDetail } from "./components";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: _id } = await params;
    return { title: `${APP_NAME} | Vehicle Details` };
}

const fetchVehicle = async (id: string): Promise<IVehicle | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<IVehicle>>(`/vehicles/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data?.data ?? null;
    } catch (error: unknown) {
        const err = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching vehicle:", err?.message);
        return null;
    }
};

const VehicleDetailPage = async ({ params }: Props) => {
    const { id } = await params;
    const initialData = await fetchVehicle(id);
    return (
        <section className="flex w-full flex-col pb-2">
            <VehicleDetail id={id} initialData={initialData} />
        </section>
    );
};

export default VehicleDetailPage;
