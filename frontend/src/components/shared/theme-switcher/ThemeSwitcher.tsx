"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const ThemeSwitcher = () => {
    const { theme, setTheme, systemTheme } = useTheme();
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const toggleTheme = useCallback(() => {
        const current = theme === "system" ? systemTheme : theme;
        const newTheme = current === "dark" ? "light" : "dark";

        // Enable transitions
        document.documentElement.classList.add("theme-transitioning");

        // Change theme
        setTheme(newTheme);

        // Cleanup after animation
        setTimeout(() => {
            document.documentElement.classList.remove("theme-transitioning");
        }, 1000);
    }, [theme, systemTheme, setTheme]);

    const isDark = (theme === "system" ? systemTheme : theme) === "dark";

    // Voorkom hydratatie mismatch - toon neutrale state tijdens SSR
    if (!mounted) {
        return (
            <button
                className={cn(
                    "relative flex items-center justify-center",
                    "h-9 w-9 rounded-full",
                    "text-muted-foreground",
                    "overflow-hidden"
                )}
                aria-label="Toggle theme"
                disabled
            >
                <Sun className="h-4 w-4 opacity-50" />
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "relative flex items-center justify-center",
                "h-9 w-9 rounded-full",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted/50",
                "transition-colors",
                "overflow-hidden"
            )}
            aria-label="Toggle theme"
        >
            <Sun
                className={cn(
                    "h-4 w-4",
                    "transition-all duration-700",
                    isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
                )}
            />
            <Moon
                className={cn(
                    "absolute h-4 w-4",
                    "transition-all duration-700",
                    isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
                )}
            />
        </button>
    );
};
