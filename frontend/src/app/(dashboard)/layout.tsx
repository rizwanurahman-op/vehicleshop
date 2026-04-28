import { Sidebar, Navbar, BottomNav } from "@components/common";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar — desktop only */}
            <Sidebar />

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-y-auto scrollbar-thin pb-16 md:pb-0">
                    <div className="p-4 sm:p-6 lg:p-8">{children}</div>
                </main>
                <BottomNav />
            </div>
        </div>
    );
}
