import { Metadata } from "next";
import { APP_NAME } from "@data";
import { VehicleList } from "./components";
import { serverFetch } from "@/lib/serverFetch";

export const metadata: Metadata = { title: `${APP_NAME} | Vehicle Inventory` };

const VehiclesPage = async () => {
    const { data: initialData } = await serverFetch<VehiclePaginatedData>("/vehicles?page=1&limit=15");
    return (
        <section className="flex w-full flex-col pb-2">
            <VehicleList initialData={initialData} />
        </section>
    );
};

export default VehiclesPage;
