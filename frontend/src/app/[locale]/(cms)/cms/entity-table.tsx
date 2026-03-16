"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { columns, type ProductionEntity } from "@/app/table-entities/columns";
import { DataTable } from "@/app/table-entities/data-table";

const MOCK_DATA: ProductionEntity[] = [
    {
        title: "Nirvana!",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
    },
    {
        title: "Article about viernulvier",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
    },
    {
        title: "De Vooruit",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
    },
    {
        title: "entity 4",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
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
