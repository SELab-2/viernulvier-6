"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { ProductionEvent } from "./event-columns";

export type Production = {
    id: string;
    source_id: number | null;
    slug: string;
    supertitle_nl: string | null;
    supertitle_en: string | null;
    title_nl: string | null;
    title_en: string | null;
    artist_nl: string | null;
    artist_en: string | null;
    meta_title_nl: string | null;
    meta_title_en: string | null;
    meta_description_nl: string | null;
    meta_description_en: string | null;
    tagline_nl: string | null;
    tagline_en: string | null;
    teaser_nl: string | null;
    teaser_en: string | null;
    description_nl: string | null;
    description_en: string | null;
    description_extra_nl: string | null;
    description_extra_en: string | null;
    description_2_nl: string | null;
    description_2_en: string | null;
    video_1: string | null;
    video_2: string | null;
    quote_nl: string | null;
    quote_en: string | null;
    quote_source_nl: string | null;
    quote_source_en: string | null;
    programme_nl: string | null;
    programme_en: string | null;
    info_nl: string | null;
    info_en: string | null;
    description_short_nl: string | null;
    description_short_en: string | null;
    eticket_info: string | null;
    uitdatabank_theme: string | null;
    uitdatabank_type: string | null;
    /** Computed server-side: "complete" if all key content fields are present */
    metadata_status: "partial" | "complete";
    /** Not from backend — client-side only for nested display */
    events?: ProductionEvent[];
};

export const productionFields: FieldDef<Production>[] = [
    { key: "slug", label: "Slug", type: "text", readOnly: true },
    { key: "title_nl", label: "Title (NL)", type: "text" },
    { key: "title_en", label: "Title (EN)", type: "text" },
    { key: "artist_nl", label: "Performer (NL)", type: "text" },
    { key: "artist_en", label: "Performer (EN)", type: "text" },
    { key: "supertitle_nl", label: "Supertitle (NL)", type: "text" },
    { key: "supertitle_en", label: "Supertitle (EN)", type: "text" },
    { key: "tagline_nl", label: "Tagline (NL)", type: "text" },
    { key: "tagline_en", label: "Tagline (EN)", type: "text" },
    { key: "teaser_nl", label: "Teaser (NL)", type: "text" },
    { key: "teaser_en", label: "Teaser (EN)", type: "text" },
    { key: "description_short_nl", label: "Short description (NL)", type: "text" },
    { key: "description_short_en", label: "Short description (EN)", type: "text" },
    { key: "metadata_status", label: "Status", type: "text", readOnly: true },
];

export function makeProductionColumns(
    options: {
        onEdit?: (entity: Production) => void;
    } = {}
): ColumnDef<Production>[] {
    return [
        { accessorKey: "title_nl", header: "Title (NL)" },
        { accessorKey: "artist_nl", header: "Performer" },
        { accessorKey: "tagline_nl", header: "Tagline (NL)" },
        { accessorKey: "metadata_status", header: "Status" },
        makeActionsColumn<Production>({
            label: "production",
            copyKey: "title_nl",
            onEdit: options.onEdit,
        }),
    ];
}
