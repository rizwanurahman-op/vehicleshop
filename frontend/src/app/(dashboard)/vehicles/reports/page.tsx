import { Metadata } from "next";
import { APP_NAME } from "@data";
import { VehicleReports } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Vehicle Reports` };

const VehicleReportsPage = () => {
    return (
        <section className="flex w-full flex-col pb-2">
            <VehicleReports />
        </section>
    );
};

export default VehicleReportsPage;
