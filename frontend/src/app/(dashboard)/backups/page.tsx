import { Metadata } from "next";
import { APP_NAME } from "@data";
import { BackupManager } from "./backup-manager";

export const metadata: Metadata = {
    title: `${APP_NAME} | Backups`,
    description: "Manage automated database backups to Telegram",
};

export default function BackupsPage() {
    return <BackupManager />;
}
