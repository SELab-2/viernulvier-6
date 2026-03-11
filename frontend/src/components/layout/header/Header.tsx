"use client";

import { LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { LocaleSwitcher, ThemeSwitcher } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useUser, useLogout } from "@/hooks/useAuth";
import { usePathname } from "@/i18n/routing";

export const Header = () => {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";
    const generalTranslations = useTranslations("General");
    const navigationTranslations = useTranslations("Navigation");

    const { data: user } = useUser({ enabled: !isLoginPage });
    const { mutate: logout, isPending: isLoggingOut } = useLogout();

    return (
        <header className="bg-background/80 fixed top-0 right-0 left-0 z-50 px-6 py-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
                <Link
                    href="/"
                    className="text-foreground/80 hover:text-foreground text-xs font-medium tracking-[0.3em] uppercase transition-colors duration-300"
                >
                    {generalTranslations("brandName")}
                </Link>

                <nav className="flex items-center gap-2">
                    <ThemeSwitcher />
                    <LocaleSwitcher />

                    {/* Auth button */}
                    {user ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => logout()}
                            disabled={isLoggingOut}
                            className="text-foreground/70 hover:text-destructive h-9 gap-2 text-xs transition-all duration-300"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                {navigationTranslations("logout")}
                            </span>
                        </Button>
                    ) : !isLoginPage ? (
                        <Link href="/login">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-foreground/70 hover:text-foreground h-9 gap-2 text-xs transition-all duration-300"
                            >
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    {navigationTranslations("login")}
                                </span>
                            </Button>
                        </Link>
                    ) : null}
                </nav>
            </div>
        </header>
    );
};
