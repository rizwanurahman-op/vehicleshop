import { Metadata } from "next";
import { APP_NAME } from "@data";
import { VehicleForm } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Add Vehicle` };

const NewVehiclePage = () => {
    return (
        <section className="flex w-full flex-col pb-2">
            <VehicleForm />
        </section>
    );
};

export default NewVehiclePage;
