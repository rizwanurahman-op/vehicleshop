import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { User, Shield, Settings, Users, ArrowRight } from "lucide-react";
import { AdminOnly } from "@components/shared";
import Link from "next/link";

export const metadata: Metadata = {
    title: `${APP_NAME} | Settings`,
    description: "Manage your account profile and security settings",
};

export default function SettingsPage() {
    return (
        <section className="flex w-full flex-col gap-8 pb-20 md:pb-4 max-w-3xl mx-auto">
            {/* Page header */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-md">
                        <Settings className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Settings</h2>
                </div>
                <p className="text-sm text-muted-foreground ml-[52px]">
                    Manage your account profile and security preferences
                </p>
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {/* Profile Card */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="glass-header flex items-center gap-3 px-5 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground leading-none">Edit Profile</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Update your username and email</p>
                        </div>
                    </div>
                    <div className="p-5">
                        <ProfileForm />
                    </div>
                </div>

                {/* Security Card */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="glass-header flex items-center gap-3 px-5 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground leading-none">Change Password</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Update your account security</p>
                        </div>
                    </div>
                    <div className="p-5">
                        <PasswordForm />
                    </div>
                </div>
            </div>

            {/* User Management link card — admin only */}
            <AdminOnly>
                <Link href="/users" className="group block">
                    <div className="rounded-xl border border-violet-500/20 bg-card shadow-sm overflow-hidden hover:border-violet-500/40 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                                    <Users className="h-5 w-5 text-violet-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">User Management</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Create and manage viewer accounts with read-only access
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="hidden sm:inline text-xs text-muted-foreground">Open</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </div>
                    </div>
                </Link>
            </AdminOnly>

            {/* Account info strip */}
            <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account info</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Role</p>
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                            Admin
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Account type</p>
                        <p className="text-sm font-medium text-foreground">Single admin</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Session</p>
                        <p className="text-sm font-medium text-foreground">7-day refresh</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
