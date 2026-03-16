"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DataTable } from "./tables/data-table";
import { columns as productionColumns, type Production } from "./tables/productions/columns";
import { eventColumns, type ProductionEvent } from "./tables/productions/event-columns";
import { type Article, columns as articleColumns } from "./tables/articles/columns";
import { columns as venueColumns, type Venue } from "./tables/venues/columns";
import { type Hall, hallColumns } from "./tables/venues/hall-columns";
import { columns as performerColumns, type Performer } from "./tables/performers/columns";
import { useSearchParams } from "next/navigation";
import type { Row } from "@tanstack/react-table";

const MOCK_PRODUCTIONS: Production[] = [
    {
        title: "Cut op de set!",
        metadata_status: "complete",
        tagline:
            "Een intieme theatershow als afsluiter van de rollercoaster die Droomvoeding was, voordat Brihang zich terugtrekt om nieuw materiaal aaneen te rijgen.",
        performer: "Brihang",
        events: [
            {
                date: "19/03/2026",
                time: "20:00",
                venue: "De Vooruit - Theaterzaal",
                ticket_status: "sold_out",
            },
        ],
    },
    {
        title: "Nirvana!",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
        events: [
            {
                date: "1991-11-25",
                time: "20:00",
                venue: "De Vooruit",
                ticket_status: "sold_out",
            },
            {
                date: "1991-11-26",
                time: "20:00",
                venue: "De Vooruit",
                ticket_status: "sold_out",
            },
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
        id: "00000000-0000-0000-0000-000000000001",
        name: "De Vooruit",
        code: "VOORUIT",
        street: "Sint-Pietersnieuwstraat",
        number: "23",
        postal_code: "9000",
        city: "Gent",
        country: "BE",
        phone_1: null,
        phone_2: null,
        is_owned_by_viernulvier: true,
        uitdatabank_id: null,
        halls: [
            {
                id: "00000000-0000-0000-0000-000000000010",
                name: "Balzaal",
                slug: "balzaal",
                vendor_id: null,
                box_office_id: null,
                seat_selection: false,
                open_seating: true,
                remark: null,
                space_id: null,
            },
            {
                id: "00000000-0000-0000-0000-000000000011",
                name: "Filmzaal",
                slug: "filmzaal",
                vendor_id: null,
                box_office_id: null,
                seat_selection: true,
                open_seating: false,
                remark: null,
                space_id: null,
            },
        ],
    },
    {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Stadschouwburg",
        code: null,
        street: "Sint-Baafsplein",
        number: "17",
        postal_code: "9000",
        city: "Gent",
        country: "BE",
        phone_1: null,
        phone_2: null,
        is_owned_by_viernulvier: false,
        uitdatabank_id: null,
        halls: [],
    },
];

const MOCK_PERFORMERS: Performer[] = [
    {
        name: "Nirvana",
        metadata_status: "partial",
    },
];

export type ContentType = "productions" | "articles" | "venues" | "performers";

function isValidContentType(value: string | null): value is ContentType {
    return ["productions", "articles", "venues", "performers"].includes(value ?? "");
}

function renderProductionEvents(row: Row<Production>) {
    const events: ProductionEvent[] = row.original.events ?? [];
    return (
        <div className="bg-muted/30 px-6 py-1">
            <DataTable columns={eventColumns} data={events} compact />
        </div>
    );
}

function renderVenueHalls(row: Row<Venue>) {
    const halls: Hall[] = row.original.halls ?? [];
    return (
        <div className="bg-muted/30 px-6 py-1">
            <DataTable columns={hallColumns} data={halls} compact />
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
                    expanderLabels={{
                        show: "Show events",
                        hide: "Hide events",
                    }}
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
                    expanderLabels={{ show: "Show halls", hide: "Hide halls" }}
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
