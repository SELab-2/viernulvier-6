"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { Production, ProductionUpdateInput } from "@/types/models/production.types";

export const productionFields: FieldDef<Production>[] = [
    { key: "slug", label: "Slug", type: "text", readOnly: true },
    { key: "titleNl", label: "Title (NL)", type: "text" },
    { key: "titleEn", label: "Title (EN)", type: "text" },
    { key: "artistNl", label: "Artist (NL)", type: "text" },
    { key: "artistEn", label: "Artist (EN)", type: "text" },
    { key: "supertitleNl", label: "Supertitle (NL)", type: "text" },
    { key: "supertitleEn", label: "Supertitle (EN)", type: "text" },
    { key: "taglineNl", label: "Tagline (NL)", type: "text" },
    { key: "taglineEn", label: "Tagline (EN)", type: "text" },
    { key: "teaserNl", label: "Teaser (NL)", type: "text" },
    { key: "teaserEn", label: "Teaser (EN)", type: "text" },
    { key: "descriptionShortNl", label: "Short desc (NL)", type: "text" },
    { key: "descriptionShortEn", label: "Short desc (EN)", type: "text" },
    { key: "descriptionNl", label: "Description (NL)", type: "text" },
    { key: "descriptionEn", label: "Description (EN)", type: "text" },
    { key: "quoteNl", label: "Quote (NL)", type: "text" },
    { key: "quoteEn", label: "Quote (EN)", type: "text" },
    { key: "quoteSourceNl", label: "Quote source (NL)", type: "text" },
    { key: "quoteSourceEn", label: "Quote source (EN)", type: "text" },
    { key: "video1", label: "Video 1", type: "text" },
    { key: "video2", label: "Video 2", type: "text" },
    { key: "eticketInfo", label: "E-ticket info", type: "text" },
    { key: "uitdatabankTheme", label: "UiTdatabank theme", type: "text" },
    { key: "uitdatabankType", label: "UiTdatabank type", type: "text" },
];

export function toProductionUpdateInput(entity: Production): ProductionUpdateInput {
    return {
        id: entity.id,
        slug: entity.slug,
        sourceId: entity.sourceId,
        supertitleNl: entity.supertitleNl,
        supertitleEn: entity.supertitleEn,
        titleNl: entity.titleNl,
        titleEn: entity.titleEn,
        artistNl: entity.artistNl,
        artistEn: entity.artistEn,
        metaTitleNl: entity.metaTitleNl,
        metaTitleEn: entity.metaTitleEn,
        metaDescriptionNl: entity.metaDescriptionNl,
        metaDescriptionEn: entity.metaDescriptionEn,
        taglineNl: entity.taglineNl,
        taglineEn: entity.taglineEn,
        teaserNl: entity.teaserNl,
        teaserEn: entity.teaserEn,
        descriptionNl: entity.descriptionNl,
        descriptionEn: entity.descriptionEn,
        descriptionExtraNl: entity.descriptionExtraNl,
        descriptionExtraEn: entity.descriptionExtraEn,
        description2Nl: entity.description2Nl,
        description2En: entity.description2En,
        video1: entity.video1,
        video2: entity.video2,
        quoteNl: entity.quoteNl,
        quoteEn: entity.quoteEn,
        quoteSourceNl: entity.quoteSourceNl,
        quoteSourceEn: entity.quoteSourceEn,
        programmeNl: entity.programmeNl,
        programmeEn: entity.programmeEn,
        infoNl: entity.infoNl,
        infoEn: entity.infoEn,
        descriptionShortNl: entity.descriptionShortNl,
        descriptionShortEn: entity.descriptionShortEn,
        eticketInfo: entity.eticketInfo,
        uitdatabankTheme: entity.uitdatabankTheme,
        uitdatabankType: entity.uitdatabankType,
    };
}

export function makeProductionColumns(
    options: {
        onEdit?: (entity: Production) => void;
    } = {}
): ColumnDef<Production>[] {
    return [
        { accessorKey: "titleNl", header: "Title (NL)" },
        { accessorKey: "titleEn", header: "Title (EN)" },
        { accessorKey: "artistNl", header: "Artist" },
        { accessorKey: "slug", header: "Slug" },
        makeActionsColumn<Production>({
            label: "production",
            copyKey: "slug",
            onEdit: options.onEdit,
        }),
    ];
}
