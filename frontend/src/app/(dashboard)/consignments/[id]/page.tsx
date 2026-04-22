import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ConsignmentDetail } from "./components";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    void id;
    return { title: `${APP_NAME} | Consignment Details` };
}

const fetchConsignment = async (id: string): Promise<IConsignmentVehicle | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<IConsignmentVehicle>>(`/consignments/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data?.data ?? null;
    } catch (error: unknown) {
        const err = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching consignment:", err?.message);
        return null;
    }
};

const ConsignmentDetailPage = async ({ params }: Props) => {
    const { id } = await params;
    const initialData = await fetchConsignment(id);
    return (
        <section className="flex w-full flex-col pb-2">
            <ConsignmentDetail id={id} initialData={initialData} />
        </section>
    );
};

export default ConsignmentDetailPage;
