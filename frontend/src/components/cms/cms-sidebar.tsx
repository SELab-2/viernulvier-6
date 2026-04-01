"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Clapperboard, MapPin, Newspaper, Users, Database, FileUp } from "lucide-react";

const navItems = [
    { key: "productions", href: "/cms/productions", icon: Clapperboard, edition: "Ed. 01" },
    { key: "locations", href: "/cms/locations", icon: MapPin, edition: "Ed. 02" },
    { key: "articles", href: "/cms/articles", icon: Newspaper, edition: "Ed. 03" },
    { key: "performers", href: "/cms/performers", icon: Users, edition: "Ed. 04" },
];

const utilityItems = [
    { key: "ingest", href: "/cms/ingest", icon: Database, edition: "Ed. 05" },
    { key: "import", href: "/cms/import", icon: FileUp, edition: "Ed. 06" },
];

export function CmsSidebar() {
    const t = useTranslations("Cms");
    const pathname = usePathname();

    const isActive = (href: string) => {
        return pathname.startsWith(href);
    };

    return (
        <aside className="border-foreground/20 bg-background flex h-full w-56 flex-col border-r">
            {/* Header - Newspaper style */}
            <div className="border-foreground/20 border-b p-5">
                <Link href="/cms" className="block text-center">
                    <div className="font-display text-foreground text-[28px] leading-tight font-black tracking-tight uppercase">
                        CMS
                    </div>
                    <div className="bg-foreground mx-auto mt-2 h-0.5 w-16" />
                    <div className="text-muted-foreground mt-2 font-mono text-[9px] tracking-[3px] uppercase">
                        Content Management
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-5">
                {/* Main Content Section */}
                <div className="mb-5">
                    <div className="text-muted-foreground mb-3 px-5 text-center font-mono text-xs tracking-[2px] uppercase">
                        — Inhoud —
                    </div>

                    <div className="space-y-2 px-3">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={`group relative flex flex-col border p-2.5 transition-all ${
                                        active
                                            ? "border-foreground bg-foreground/5"
                                            : "border-foreground/10 hover:border-foreground/30"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="text-muted-foreground font-mono text-[8px] tracking-[1px] uppercase">
                                            {item.edition}
                                        </div>
                                        <Icon
                                            className={`h-3.5 w-3.5 transition-colors ${
                                                active
                                                    ? "text-foreground"
                                                    : "text-muted-foreground/40 group-hover:text-foreground"
                                            }`}
                                        />
                                    </div>
                                    <div className="mt-1.5">
                                        <span
                                            className={`font-display text-sm font-bold tracking-tight ${
                                                active
                                                    ? "text-foreground"
                                                    : "text-foreground/70 group-hover:text-foreground"
                                            }`}
                                        >
                                            {t(item.key)}
                                        </span>
                                    </div>
                                    {active && <div className="bg-foreground mt-1.5 h-0.5 w-8" />}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Utility Section */}
                <div>
                    <div className="text-muted-foreground mb-3 px-5 text-center font-mono text-xs tracking-[2px] uppercase">
                        — Systeem —
                    </div>

                    <div className="space-y-2 px-3">
                        {utilityItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={`group relative flex items-center gap-3 border p-2.5 transition-all ${
                                        active
                                            ? "border-foreground bg-foreground/5"
                                            : "border-foreground/10 hover:border-foreground/30"
                                    }`}
                                >
                                    <Icon
                                        className={`h-3.5 w-3.5 transition-colors ${
                                            active
                                                ? "text-foreground"
                                                : "text-muted-foreground/40 group-hover:text-foreground"
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <span
                                            className={`font-display text-sm font-bold tracking-tight ${
                                                active
                                                    ? "text-foreground"
                                                    : "text-foreground/70 group-hover:text-foreground"
                                            }`}
                                        >
                                            {t(item.key)}
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground font-mono text-[8px] tracking-[1px]">
                                        {item.edition}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </aside>
    );
}
