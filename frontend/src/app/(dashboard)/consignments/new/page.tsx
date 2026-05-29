import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ConsignmentForm } from "./components";
import { ViewerGuard } from "@components/shared";

export const metadata: Metadata = { title: `${APP_NAME} | Register Consignment` };

const NewConsignmentPage = async () => {
    return (
        <section className="flex w-full flex-col pb-2">
            <ViewerGuard redirectTo="/consignments" />
            <ConsignmentForm />
        </section>
    );
};

export default NewConsignmentPage;
