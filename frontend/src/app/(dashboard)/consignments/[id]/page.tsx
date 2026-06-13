import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ConsignmentDetail } from "./components";
import { serverFetch } from "@/lib/serverFetch";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    void id;
    return { title: `${APP_NAME} | Consignment Details` };
}

const ConsignmentDetailPage = async ({ params }: Props) => {
    const { id } = await params;
    const { data: initialData } = await serverFetch<IConsignmentVehicle>(`/consignments/${id}`);
    return (
        <section className="flex w-full flex-col pb-2">
            <ConsignmentDetail id={id} initialData={initialData} />
        </section>
    );
};

export default ConsignmentDetailPage;
