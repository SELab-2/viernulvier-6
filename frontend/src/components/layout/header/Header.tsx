"use client";

import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/shared/locale-switcher/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher/ThemeSwitcher";

export const Header = () => {
    return (
        <header className={cn("fixed top-0 right-0 left-0 z-50", "bg-transparent")}>
            <div className="container mx-auto px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    {/* Logo - VierNulVier */}
                    <span
                        className={cn("text-xs font-semibold tracking-[0.15em]", "text-foreground")}
                    >
                        VierNulVier
                    </span>

                    {/* Actions */}
                    <div className="flex items-center">
                        <ThemeSwitcher />
                        <div className="bg-border/40 mx-2 h-3.5 w-px" />
                        <LocaleSwitcher />
                    </div>
                </div>
            </div>
        </header>
    );
};
