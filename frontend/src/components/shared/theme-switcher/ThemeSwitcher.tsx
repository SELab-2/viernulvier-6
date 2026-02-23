"use client";

import { useCallback } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui";
import dynamic from "next/dynamic";

const ThemeSwitcherComponent = () => {
    const { setTheme, theme } = useTheme();

    const toggleTheme = useCallback(() => {
        setTheme(theme === "dark" ? "light" : "dark");
    }, [setTheme, theme]);

    return (
        <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
            ) : (
                <MoonIcon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
};

// We exporteren een dynamische versie die SSR volledig uitschakelt
export const ThemeSwitcher = dynamic(() => Promise.resolve(ThemeSwitcherComponent), {
    ssr: false,
    loading: () => <div className="w-9 h-9" />, // Behoudt de placeholder tegen layout shift
});