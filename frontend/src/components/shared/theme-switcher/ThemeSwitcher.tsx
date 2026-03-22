"use client";

import { useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSwitcher() {
    const { setTheme, theme } = useTheme();

    const toggleTheme = useCallback(() => {
        setTheme(theme === "dark" ? "light" : "dark");
    }, [setTheme, theme]);

    return (
        <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
        >
            <Sun className="hidden h-3 w-3 [html.dark_&]:block" />
            <Moon className="hidden h-3 w-3 [html.light_&]:block" />
            <span className="hidden [html.dark_&]:inline">Licht</span>
            <span className="hidden [html.light_&]:inline">Donker</span>
        </button>
    );
}
