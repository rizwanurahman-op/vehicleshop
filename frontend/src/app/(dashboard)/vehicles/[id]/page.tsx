import { Metadata } from "next";
import { APP_NAME } from "@data";
import { VehicleDetail } from "./components";
import { serverFetch } from "@/lib/serverFetch";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    await params;
    return { title: `${APP_NAME} | Vehicle Details` };
}

const VehicleDetailPage = async ({ params }: Props) => {
    const { id } = await params;
    const { data: initialData } = await serverFetch<IVehicle>(`/vehicles/${id}`);
    return (
        <section className="flex w-full flex-col pb-2">
            <VehicleDetail id={id} initialData={initialData} />
        </section>
    );
};

export default VehicleDetailPage;
