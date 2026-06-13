import { Metadata } from "next";
import { APP_NAME } from "@data";
import { SalesList } from "./components";
import { serverFetch } from "@/lib/serverFetch";

export const metadata: Metadata = { title: `${APP_NAME} | Sales Register` };

const SalesPage = async () => {
    const { data: initialData } = await serverFetch<SalesPaginatedData>("/sales?page=1&limit=20");
    return (
        <section className="flex w-full flex-col pb-2">
            <SalesList initialData={initialData} />
        </section>
    );
};

export default SalesPage;
