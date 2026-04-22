import { Suspense } from "react";
import ExchangeList from "./components/exchange-list";

export const metadata = { title: "Exchanges | VehicleBook", description: "View all cross-vehicle exchange deals and settlement status" };

export default function ExchangesPage() {
    return (
        <div className="flex w-full flex-col gap-5 pb-10">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading exchanges...</div>}>
                <ExchangeList />
            </Suspense>
        </div>
    );
}
