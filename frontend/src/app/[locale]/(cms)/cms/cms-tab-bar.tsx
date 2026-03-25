"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/routing";

const CONTENT_SEGMENTS = ["productions", "articles", "locations", "performers"];

type Tab = "overview" | "content" | "ingest" | "import";

const TABS: { value: Tab; label: string; href: string }[] = [
    { value: "overview", label: "CMS Overview", href: "/cms" },
    { value: "content", label: "Manage content", href: "/cms/productions" },
    { value: "ingest", label: "Ingest", href: "/cms/ingest" },
    { value: "import", label: "Automatic import", href: "/cms/import" },
];

function getActiveTab(pathname: string): Tab {
    const segments = pathname.split("/");
    const lastSegment = segments[segments.length - 1] ?? "";
    if (CONTENT_SEGMENTS.includes(lastSegment)) return "content";
    if (lastSegment === "ingest") return "ingest";
    if (lastSegment === "import") return "import";
    return "overview";
}

export function CmsTabBar() {
    const pathname = usePathname();
    const router = useRouter();
    const activeTab = getActiveTab(pathname);

    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => {
                const tab = TABS.find((t) => t.value === value);
                if (tab) router.push(tab.href);
            }}
        >
            <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
                {TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex-none">
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
