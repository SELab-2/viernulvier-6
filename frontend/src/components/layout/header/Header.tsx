"use client";

import { cn } from "@/lib/utils";
import { LocaleSwitcher, ThemeSwitcher } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useUser, useLogout } from "@/hooks/useAuth";
import { usePathname } from "@/i18n/routing";

export const Header = () => {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    const { data: user } = useUser({ enabled: !isLoginPage });
    const { mutate: logout, isPending: isLoggingOut } = useLogout();

    return (
        <header className="flex w-full items-center justify-center gap-4 py-8">
            <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <LocaleSwitcher />
                {user && (
                    <Button
                        variant="ghost"
                        onClick={() => logout()}
                        disabled={isLoggingOut}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        {isLoggingOut ? "..." : "Logout"}
                    </Button>
                )}
            </div>
        </header>
    );
};
