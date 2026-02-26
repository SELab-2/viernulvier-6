"use client";

import * as React from "react";

export type Theme = "light" | "dark";

/**
 * Returns the current theme ("light" or "dark").
 * Automatically updates when the user toggles dark mode.
 *
 * @example
 * ```tsx
 * // With Tailwind classes (smooth CSS transition):
 * const theme = useTheme();
 * <div className="transition-colors duration-500 bg-white dark:bg-black">
 *   Current: {theme}
 * </div>
 *
 * // With inline styles:
 * const theme = useTheme();
 * <div style={{
 *   backgroundColor: theme === "dark" ? "#0a0a0a" : "#fafafa",
 *   transition: "background-color 500ms ease-out"
 * }} />
 * ```
 */
export function useTheme(): Theme {
    const [theme, setTheme] = React.useState<Theme>("light");

    React.useEffect(() => {
        const checkTheme = () => {
            const isDark = document.documentElement.classList.contains("dark");
            setTheme(isDark ? "dark" : "light");
        };

        checkTheme();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    checkTheme();
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    return theme;
}
