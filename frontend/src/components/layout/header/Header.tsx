import { LocaleSwitcher, ThemeSwitcher } from "@/components/shared";

export const Header = () => {
    return (
        <header className="flex w-full items-center justify-center gap-4 py-8">
            <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <LocaleSwitcher />
            </div>
        </header>
    );
};
