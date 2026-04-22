import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ConsignmentForm } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Register Consignment` };

const NewConsignmentPage = async () => {
    return (
        <section className="flex w-full flex-col pb-2">
            <ConsignmentForm />
        </section>
    );
};

export default NewConsignmentPage;
