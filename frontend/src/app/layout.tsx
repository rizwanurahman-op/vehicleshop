import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/providers/AppProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
    title: "VehicleBook — Vehicle Shop Management",
    description: "Digitize your vehicle shop operations — investor management, vehicle tracking, and financial reporting.",
    keywords: ["vehicle shop", "bike shop", "car shop", "investor management", "financial tracking"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} ${jetbrains.variable} font-sans antialiased`}>
                <AppProvider>{children}</AppProvider>
            </body>
        </html>
    );
}
