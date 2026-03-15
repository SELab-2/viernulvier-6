"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { columns, type TableEntity } from "@/app/table-entities/columns";
import { DataTable } from "@/app/table-entities/data-table";

const MOCK_DATA: TableEntity[] = [
    {
        name: "entity 1",
        entity_type: "production",
        metadata_status: "complete",
    },
    {
        name: "Article about viernulvier",
        entity_type: "article",
        metadata_status: "complete",
    },
    {
        name: "De Vooruit",
        entity_type: "location",
        metadata_status: "complete",
    },
    {
        name: "entity 4",
        entity_type: "production",
        metadata_status: "complete",
    },
];

export function EntityTable() {
    return (
        <SidebarProvider className="h-full min-h-0">
            <AppSidebar />
            <main className="flex-1 overflow-auto p-4">
                <SidebarTrigger />
                <DataTable columns={columns} data={MOCK_DATA} />
            </main>
        </SidebarProvider>
    );
}
