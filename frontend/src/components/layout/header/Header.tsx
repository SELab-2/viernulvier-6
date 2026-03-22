"use client";
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
        <header className="border-border/40 flex w-full items-center justify-end gap-2 border-b px-10 py-3">
            <ThemeSwitcher />
            <LocaleSwitcher />
            {user && (
                <Button
                    variant="ghost"
                    onClick={() => logout()}
                    disabled={isLoggingOut}
                    className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-[1.4px] uppercase"
                >
                    {isLoggingOut ? "..." : "Logout"}
                </Button>
            )}
        </header>
    );
};
