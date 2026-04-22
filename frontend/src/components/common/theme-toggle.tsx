"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const ThemeToggle = () => {
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                "text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            )}
            title="Toggle theme"
        >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    );
};

export default ThemeToggle;
