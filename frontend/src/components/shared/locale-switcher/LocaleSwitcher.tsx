"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const locales = [
    { code: "nl", label: "NL" },
    { code: "en", label: "EN" },
];

export const LocaleSwitcher = () => {
    const t = useTranslations("LocaleSwitcher");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const onSelectChange = (nextLocale: string) => {
        router.replace({ pathname, query: params }, { locale: nextLocale });
        setOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center gap-1",
                    "h-9 px-2",
                    "text-[11px] font-medium tracking-wider",
                    "text-muted-foreground hover:text-foreground",
                    "transition-colors duration-300"
                )}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={t("label")}
            >
                <span className={open ? "text-foreground" : ""}>{locale.toUpperCase()}</span>
                <span
                    className={cn(
                        "text-muted-foreground/30",
                        "transition-transform duration-300",
                        open && "rotate-90"
                    )}
                >
                    /
                </span>
            </button>

            {open && (
                <div
                    className={cn(
                        "absolute top-full right-0 z-50 mt-1",
                        "flex flex-col",
                        "bg-background/80 backdrop-blur-md",
                        "border-border/20 border",
                        "animate-fade-in"
                    )}
                    role="listbox"
                >
                    {locales.map((loc) => (
                        <button
                            key={loc.code}
                            onClick={() => onSelectChange(loc.code)}
                            className={cn(
                                "px-3 py-1.5",
                                "text-[11px] font-medium tracking-wider",
                                "transition-colors duration-200",
                                locale === loc.code
                                    ? "text-foreground"
                                    : "text-muted-foreground/50 hover:text-muted-foreground"
                            )}
                            role="option"
                            aria-selected={locale === loc.code}
                        >
                            {loc.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
