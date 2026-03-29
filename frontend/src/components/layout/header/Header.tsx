"use client";

import { useTranslations } from "next-intl";
import { useUser, useLogout } from "@/hooks/useAuth";
import { usePathname } from "@/i18n/routing";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

export const Header = () => {
    const t = useTranslations("Header");
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    const { data: user } = useUser({ enabled: !isLoginPage });
    const { mutate: logout, isPending: isLoggingOut } = useLogout();

    return (
        <header className="border-border/40 flex w-full items-center justify-end gap-4 border-b px-10 py-3">
            <ThemeSwitcher />
            <LocaleSwitcher />
            {user && (
                <button
                    onClick={() => logout()}
                    disabled={isLoggingOut}
                    className="text-muted-foreground hover:text-foreground cursor-pointer font-mono text-[10px] tracking-[1.4px] uppercase transition-colors disabled:opacity-50"
                >
                    {isLoggingOut ? t("loggingOut") : t("logout")}
                </button>
            )}
        </header>
    );
};
