"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DataTable } from "./tables/data-table";
import { columns as productionColumns, type Production } from "./tables/productions/columns";
import { eventColumns, type ProductionEvent } from "./tables/productions/event-columns";
import { columns as articleColumns, type Article } from "./tables/articles/columns";
import { columns as venueColumns, type Venue } from "./tables/venues/columns";
import { hallColumns, type Hall } from "./tables/venues/hall-columns";
import { columns as performerColumns, type Performer } from "./tables/performers/columns";
import { useSearchParams } from "next/navigation";
import type { Row } from "@tanstack/react-table";

const MOCK_PRODUCTIONS: Production[] = [
    {
        title: "Nirvana!",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
        events: [
            { date: "1991-11-25", time: "20:00", venue: "De Vooruit", ticket_status: "sold_out" },
            { date: "1991-11-26", time: "20:00", venue: "De Vooruit", ticket_status: "sold_out" },
        ],
    },
    {
        title: "De Vooruit",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
        events: [],
    },
];

const MOCK_ARTICLES: Article[] = [
    {
        title: "Article about viernulvier",
        author: "Thomas",
        published_at: "2024-01-01",
        metadata_status: "complete",
    },
];

const MOCK_VENUES: Venue[] = [
    {
        name: "De Vooruit",
        city: "Ghent",
        metadata_status: "complete",
        halls: [
            { name: "Balzaal", capacity: 1000, metadata_status: "complete" },
            { name: "Filmzaal", capacity: 200, metadata_status: "partial" },
        ],
    },
    {
        name: "Stadschouwburg",
        city: "Ghent",
        metadata_status: "partial",
        halls: [],
    },
];

const MOCK_PERFORMERS: Performer[] = [{ name: "Nirvana", metadata_status: "partial" }];

export type ContentType = "productions" | "articles" | "venues" | "performers";

function isValidContentType(value: string | null): value is ContentType {
    return ["productions", "articles", "venues", "performers"].includes(value ?? "");
}

function renderProductionEvents(row: Row<Production>) {
    const events: ProductionEvent[] = row.original.events ?? [];
    return (
        <div className="bg-muted/30 px-8 py-3">
            <DataTable columns={eventColumns} data={events} />
        </div>
    );
}

function renderVenueHalls(row: Row<Venue>) {
    const halls: Hall[] = row.original.halls ?? [];
    return (
        <div className="bg-muted/30 px-8 py-3">
            <DataTable columns={hallColumns} data={halls} />
        </div>
    );
}

function TableForType({ type }: { type: ContentType }) {
    switch (type) {
        case "productions":
            return (
                <DataTable
                    columns={productionColumns}
                    data={MOCK_PRODUCTIONS}
                    renderSubComponent={renderProductionEvents}
                    getRowCanExpand={(row) => (row.original.events?.length ?? 0) > 0}
                />
            );
        case "articles":
            return <DataTable columns={articleColumns} data={MOCK_ARTICLES} />;
        case "venues":
            return (
                <DataTable
                    columns={venueColumns}
                    data={MOCK_VENUES}
                    renderSubComponent={renderVenueHalls}
                    getRowCanExpand={(row) => (row.original.halls?.length ?? 0) > 0}
                />
            );
        case "performers":
            return <DataTable columns={performerColumns} data={MOCK_PERFORMERS} />;
    }
}

export function EntityTable() {
    const searchParams = useSearchParams();
    const rawType = searchParams.get("type");
    const activeType: ContentType = isValidContentType(rawType) ? rawType : "productions";

    return (
        <SidebarProvider className="h-full min-h-0">
            <AppSidebar activeType={activeType} />
            <main className="flex-1 overflow-auto p-4">
                <SidebarTrigger />
                <TableForType type={activeType} />
            </main>
        </SidebarProvider>
    );
}
