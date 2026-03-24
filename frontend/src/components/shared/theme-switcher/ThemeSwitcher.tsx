"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

export function ThemeSwitcher() {
    const { setTheme, resolvedTheme } = useTheme();
    const t = useTranslations("ThemeSwitcher");
    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
        >
            <Sun className="hidden h-3 w-3 [html.dark_&]:block" />
            <Moon className="hidden h-3 w-3 [html.light_&]:block" />
            <span className="hidden [html.dark_&]:inline">{t("light")}</span>
            <span className="hidden [html.light_&]:inline">{t("dark")}</span>
        </button>
    );
}
