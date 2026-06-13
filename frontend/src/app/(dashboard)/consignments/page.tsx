import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ConsignmentList } from "./components";
import { serverFetch } from "@/lib/serverFetch";

export const metadata: Metadata = { title: `${APP_NAME} | Consignment Inventory` };

const ConsignmentsPage = async () => {
    const { data: initialData } = await serverFetch<ConsignmentPaginatedData>("/consignments?page=1&limit=20");
    return (
        <section className="flex w-full flex-col pb-2">
            <ConsignmentList initialData={initialData} />
        </section>
    );
};

export default ConsignmentsPage;
