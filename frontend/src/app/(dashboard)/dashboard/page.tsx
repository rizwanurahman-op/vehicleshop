import { Metadata } from "next";
import { APP_NAME } from "@data";
import { serverFetch } from "@/lib/serverFetch";
import { Car, IndianRupee, Clock } from "lucide-react";
import {
    DashboardStats, RecentTransactions, OutstandingChart, TrendChart, QuickActions, VehicleOverview,
} from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Dashboard`,
    description: "Complete overview of your vehicle shop — inventory, consignments, finance & lenders",
};

// ── Section header ───────────────────────────────────────────────
const SectionHeader = ({
    icon: Icon, title, subtitle, color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    color: string;
}) => (
    <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
    </div>
);

export default async function DashboardPage() {
    const { data: stats } = await serverFetch<IDashboardStats>("/summary/dashboard");

    return (
        <section className="flex w-full flex-col gap-8 pb-20 md:pb-4">
            {/* Welcome */}
            <div>
                <h2 className="text-2xl font-bold text-foreground">Welcome back! 👋</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Your complete vehicle shop overview — inventory, consignments &amp; finance
                </p>
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* ── Vehicle Business ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <SectionHeader
                    icon={Car}
                    title="Vehicle Business"
                    subtitle="Own inventory, consignments, park & sale"
                    color="bg-blue-600"
                />
                <VehicleOverview data={stats} />
            </div>

            {/* ── Finance & Capital ────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <SectionHeader
                    icon={IndianRupee}
                    title="Finance & Capital"
                    subtitle="Lenders, investments and repayments — principal vs profit"
                    color="bg-violet-600"
                />
                <DashboardStats initialData={stats} />

                {/* Charts */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <TrendChart initialData={stats} />
                    <OutstandingChart initialData={stats} />
                </div>
            </div>

            {/* ── Recent Activity ──────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <SectionHeader
                    icon={Clock}
                    title="Recent Finance Activity"
                    subtitle="Latest investments and repayments across all lenders"
                    color="bg-slate-600"
                />
                <RecentTransactions initialData={stats} />
            </div>
        </section>
    );
}
