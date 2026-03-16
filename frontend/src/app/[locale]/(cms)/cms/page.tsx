"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { EntityTable } from "./entity-table";

const TABS = [
    { value: "overview", label: "CMS Overview" },
    { value: "content", label: "Manage content" },
    { value: "ingestion", label: "Ingest" },
    { value: "import", label: "Automatic import" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function isValidTab(value: string | null): value is Tab {
    return TABS.some((t) => t.value === value);
}

export default function CmsDashboardPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const rawTab = searchParams.get("tab");
    const activeTab: Tab = isValidTab(rawTab) ? rawTab : "overview";

    function handleTabChange(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        if (value !== "content") {
            params.delete("type");
        }
        router.replace(`?${params.toString()}`);
    }

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-screen flex-col">
            <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
                {TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex-none">
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="overview" className="flex-1 p-4">
                Overview content
            </TabsContent>

            <TabsContent value="content" className="m-0 flex-1 overflow-hidden">
                <EntityTable />
            </TabsContent>

            <TabsContent value="ingestion" className="flex-1 p-4">
                Ingestion content (bulk media import and metadata attachment)
            </TabsContent>

            <TabsContent value="import" className="flex-1 p-4">
                Status of the automatic marketing website import. Errors, graph, data...
            </TabsContent>
        </Tabs>
    );
}
