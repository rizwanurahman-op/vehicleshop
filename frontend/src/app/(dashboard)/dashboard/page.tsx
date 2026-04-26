import { Metadata } from "next";
import { APP_NAME } from "@data";
import axios from "@config/axios";
import { getToken } from "@/lib/getToken";
import { AxiosError } from "axios";
import { DashboardStats, RecentTransactions, OutstandingChart, TrendChart, QuickActions, VehicleOverview } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Dashboard`,
    description: "Overview of your vehicle shop financial performance",
};

const fetchDashboardStats = async (): Promise<IDashboardStats | null> => {
    const token = await getToken();
    try {
        const res = await axios.get<ApiResponse<IDashboardStats>>("/summary/dashboard", {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data.data ?? null;
    } catch (error: unknown) {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Dashboard fetch error:", errorData?.message);
        return null;
    }
};

export default async function DashboardPage() {
    const stats = await fetchDashboardStats();

    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            {/* Welcome */}
            <div>
                <h2 className="text-2xl font-bold text-foreground">Welcome back! 👋</h2>
                <p className="text-sm text-muted-foreground mt-1">Here&apos;s your vehicle shop financial overview</p>
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Vehicle Overview (Phase 2) */}
            <VehicleOverview />

            {/* Phase 1 Stat Cards */}
            <DashboardStats initialData={stats} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TrendChart initialData={stats} />
                <OutstandingChart initialData={stats} />
            </div>

            {/* Recent Transactions */}
            <RecentTransactions initialData={stats} />
        </section>
    );
}
