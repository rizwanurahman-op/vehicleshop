import { Metadata } from "next";
import { APP_NAME } from "@data";
import { PurchasesList } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Purchase Register` };

const PurchasesPage = () => {
    return (
        <section className="flex w-full flex-col pb-2">
            <PurchasesList />
        </section>
    );
};

export default PurchasesPage;
