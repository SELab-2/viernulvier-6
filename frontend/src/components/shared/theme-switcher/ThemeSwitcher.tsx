"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const ThemeSwitcher = () => {
    const { theme, setTheme, systemTheme } = useTheme();
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const toggleTheme = useCallback(() => {
        const current = theme === "system" ? systemTheme : theme;
        const newTheme = current === "dark" ? "light" : "dark";
        setTheme(newTheme);
    }, [theme, systemTheme, setTheme]);

    const isDark = (theme === "system" ? systemTheme : theme) === "dark";

    if (!mounted) {
        return (
            <button
                className="text-muted-foreground/50 flex h-9 w-9 items-center justify-center"
                aria-label="Toggle theme"
                disabled
            >
                <Sun className="h-4 w-4" />
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center transition-colors"
            aria-label="Toggle theme"
        >
            <Sun
                className={`h-4 w-4 transition-all duration-300 ${isDark ? "absolute scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`}
            />
            <Moon
                className={`h-4 w-4 transition-all duration-300 ${isDark ? "scale-100 rotate-0 opacity-100" : "absolute scale-0 -rotate-90 opacity-0"}`}
            />
        </button>
    );
};
