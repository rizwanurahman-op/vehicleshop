import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ConsignmentReports } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Consignment Reports` };

const ConsignmentReportsPage = async () => {
    return (
        <section className="flex w-full flex-col pb-2">
            <ConsignmentReports />
        </section>
    );
};

export default ConsignmentReportsPage;
