"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
    LayoutGrid,
    Calendar,
    MapPin,
    FileText,
    Users,
    Settings,
    Archive,
    ChevronRight,
} from "lucide-react";

const navItems = [
    { key: "overview", href: "/cms", icon: LayoutGrid },
    { key: "productions", href: "/cms/productions", icon: Calendar },
    { key: "locations", href: "/cms/locations", icon: MapPin },
    { key: "articles", href: "/cms/articles", icon: FileText },
    { key: "performers", href: "/cms/performers", icon: Users },
];

const systemItems = [
    { key: "ingest", href: "/cms/ingest", icon: Archive },
    { key: "import", href: "/cms/import", icon: Settings },
];

export function CmsSidebar() {
    const t = useTranslations("Cms");
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/cms") {
            return pathname === "/cms" || pathname === "/cms/";
        }
        return pathname.startsWith(href);
    };

    return (
        <aside className="border-foreground/20 bg-background flex h-full w-56 flex-col border-r">
            {/* Masthead */}
            <div className="border-foreground/20 border-b p-5">
                <Link href="/cms" className="block">
                    <div className="font-display text-foreground text-[22px] leading-none font-black tracking-tight uppercase">
                        CMS
                    </div>
                    <div className="bg-foreground mt-2 mb-1 h-0.5 w-8" />
                    <div className="text-muted-foreground font-mono text-[9px] tracking-[2px] uppercase">
                        Archive Index
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                {/* Section Label */}
                <div className="text-muted-foreground mb-3 px-5 font-mono text-[8px] tracking-[2px] uppercase">
                    — Content —
                </div>

                <ul className="space-y-0">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <li key={item.key}>
                                <Link
                                    href={item.href}
                                    className={`group flex items-center gap-3 border-l-2 px-5 py-3 font-mono text-[10px] tracking-[1.4px] uppercase transition-all ${
                                        active
                                            ? "border-foreground bg-foreground/5 text-foreground"
                                            : "text-muted-foreground hover:border-foreground/30 hover:text-foreground border-transparent"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                                    <span className="flex-1">{t(item.key)}</span>
                                    {active && <ChevronRight className="h-3 w-3" />}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Divider */}
                <div className="border-foreground/10 mx-5 my-4 border-t" />

                {/* Section Label */}
                <div className="text-muted-foreground mb-3 px-5 font-mono text-[8px] tracking-[2px] uppercase">
                    — System —
                </div>

                <ul className="space-y-0">
                    {systemItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <li key={item.key}>
                                <Link
                                    href={item.href}
                                    className={`group flex items-center gap-3 border-l-2 px-5 py-3 font-mono text-[10px] tracking-[1.4px] uppercase transition-all ${
                                        active
                                            ? "border-foreground bg-foreground/5 text-foreground"
                                            : "text-muted-foreground hover:border-foreground/30 hover:text-foreground border-transparent"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                                    <span className="flex-1">{t(item.key)}</span>
                                    {active && <ChevronRight className="h-3 w-3" />}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="border-foreground/20 border-t p-5">
                <Link
                    href="/"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2 font-mono text-[9px] tracking-[1.4px] uppercase transition-colors"
                >
                    <span>→</span>
                    <span>Back to Site</span>
                </Link>
                <div className="text-muted-foreground/50 mt-3 font-mono text-[8px] tracking-[1px]">
                    © {new Date().getFullYear()} VIERNULVIER
                </div>
            </div>
        </aside>
    );
}
