"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/shared/locale-switcher/LocaleSwitcher";

const CONTENT_SEGMENTS = ["productions", "articles", "locations", "performers"];

type Tab = "overview" | "content";

const TAB_DEFS: { value: Tab; href: string }[] = [
    { value: "overview", href: "/cms" },
    { value: "content", href: "/cms/productions" },
];

function getActiveTab(pathname: string): Tab {
    const segments = pathname.split("/");
    const lastSegment = segments[segments.length - 1] ?? "";
    if (CONTENT_SEGMENTS.includes(lastSegment)) return "content";
    return "overview";
}

export function CmsTabBar() {
    const t = useTranslations("Cms.TabBar");
    const pathname = usePathname();
    const router = useRouter();
    const activeTab = getActiveTab(pathname);

    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => {
                const tab = TAB_DEFS.find((tab) => tab.value === value);
                if (tab) router.push(tab.href);
            }}
        >
            <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
                {TAB_DEFS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex-none">
                        {t(tab.value)}
                    </TabsTrigger>
                ))}
                <div className="ml-auto flex items-center py-1">
                    <LocaleSwitcher />
                </div>
            </TabsList>
        </Tabs>
    );
}
