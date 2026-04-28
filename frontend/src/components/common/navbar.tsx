"use client";

import { usePathname } from "next/navigation";
import { useSessionStore } from "@stores/session";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Settings, Bell, Car } from "lucide-react";
import { ThemeToggle } from ".";
import { LogoutDialog } from ".";
import { useState } from "react";

const getPageTitle = (pathname: string): string => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/lenders")) return "Lenders";
    if (pathname.startsWith("/investments")) return "Investments";
    if (pathname.startsWith("/repayments")) return "Repayments";
    if (pathname.startsWith("/summary")) return "Summary";
    if (pathname.startsWith("/vehicles")) return "Vehicles";
    if (pathname.startsWith("/sales")) return "Sales";
    return "VehicleBook";
};

const Navbar = () => {
    const pathname = usePathname();
    const user = useSessionStore(s => s.user);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const title = getPageTitle(pathname);
    const initials = user?.username?.slice(0, 2).toUpperCase() || "AD";

    return (
        <>
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    {/* Replaced MobileNav with Logo for mobile */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-md md:hidden">
                        <Car className="h-4 w-4 text-white" />
                    </div>
                    <h1 className="text-lg font-bold text-foreground">{title}</h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* Notification bell */}
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <Bell className="h-4 w-4" />
                    </button>

                    <ThemeToggle />

                    {/* User menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-gradient-brand text-white text-xs font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-medium text-foreground leading-none">{user?.username || "Admin"}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role || "admin"}</p>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="font-normal">
                                <p className="font-medium">{user?.username}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" /> Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" /> Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setLogoutOpen(true)}>
                                <LogOut className="mr-2 h-4 w-4" /> Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
        </>
    );
};

export default Navbar;
