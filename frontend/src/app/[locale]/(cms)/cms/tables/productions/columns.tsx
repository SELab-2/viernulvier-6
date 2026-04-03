"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type {
    Production,
    ProductionRow,
    ProductionUpdateInput,
} from "@/types/models/production.types";

export const productionFields: FieldDef<ProductionRow>[] = [
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

export function toProductionRow(entity: Production): ProductionRow {
    const nl = entity.translations.find((t) => t.languageCode === "nl");
    const en = entity.translations.find((t) => t.languageCode === "en");
    return {
        id: entity.id,
        slug: entity.slug,
        sourceId: entity.sourceId,
        video1: entity.video1,
        video2: entity.video2,
        eticketInfo: entity.eticketInfo,
        uitdatabankTheme: entity.uitdatabankTheme,
        uitdatabankType: entity.uitdatabankType,
        supertitleNl: nl?.supertitle ?? null,
        supertitleEn: en?.supertitle ?? null,
        titleNl: nl?.title ?? null,
        titleEn: en?.title ?? null,
        artistNl: nl?.artist ?? null,
        artistEn: en?.artist ?? null,
        metaTitleNl: nl?.metaTitle ?? null,
        metaTitleEn: en?.metaTitle ?? null,
        metaDescriptionNl: nl?.metaDescription ?? null,
        metaDescriptionEn: en?.metaDescription ?? null,
        taglineNl: nl?.tagline ?? null,
        taglineEn: en?.tagline ?? null,
        teaserNl: nl?.teaser ?? null,
        teaserEn: en?.teaser ?? null,
        descriptionNl: nl?.description ?? null,
        descriptionEn: en?.description ?? null,
        descriptionExtraNl: nl?.descriptionExtra ?? null,
        descriptionExtraEn: en?.descriptionExtra ?? null,
        description2Nl: nl?.description2 ?? null,
        description2En: en?.description2 ?? null,
        quoteNl: nl?.quote ?? null,
        quoteEn: en?.quote ?? null,
        quoteSourceNl: nl?.quoteSource ?? null,
        quoteSourceEn: en?.quoteSource ?? null,
        programmeNl: nl?.programme ?? null,
        programmeEn: en?.programme ?? null,
        infoNl: nl?.info ?? null,
        infoEn: en?.info ?? null,
        descriptionShortNl: nl?.descriptionShort ?? null,
        descriptionShortEn: en?.descriptionShort ?? null,
    };
}

export function toProductionUpdateInput(row: ProductionRow): ProductionUpdateInput {
    return {
        id: row.id,
        slug: row.slug,
        sourceId: row.sourceId,
        video1: row.video1,
        video2: row.video2,
        eticketInfo: row.eticketInfo,
        uitdatabankTheme: row.uitdatabankTheme,
        uitdatabankType: row.uitdatabankType,
        translations: [
            {
                languageCode: "nl",
                supertitle: row.supertitleNl,
                title: row.titleNl,
                artist: row.artistNl,
                metaTitle: row.metaTitleNl,
                metaDescription: row.metaDescriptionNl,
                tagline: row.taglineNl,
                teaser: row.teaserNl,
                description: row.descriptionNl,
                descriptionExtra: row.descriptionExtraNl,
                description2: row.description2Nl,
                quote: row.quoteNl,
                quoteSource: row.quoteSourceNl,
                programme: row.programmeNl,
                info: row.infoNl,
                descriptionShort: row.descriptionShortNl,
            },
            {
                languageCode: "en",
                supertitle: row.supertitleEn,
                title: row.titleEn,
                artist: row.artistEn,
                metaTitle: row.metaTitleEn,
                metaDescription: row.metaDescriptionEn,
                tagline: row.taglineEn,
                teaser: row.teaserEn,
                description: row.descriptionEn,
                descriptionExtra: row.descriptionExtraEn,
                description2: row.description2En,
                quote: row.quoteEn,
                quoteSource: row.quoteSourceEn,
                programme: row.programmeEn,
                info: row.infoEn,
                descriptionShort: row.descriptionShortEn,
            },
        ],
    };
}

export function makeProductionColumns(options: {
    onEdit: (row: ProductionRow) => void;
}): ColumnDef<Production>[] {
    return [
        {
            id: "titleNl",
            header: "Titel (NL)",
            accessorFn: (row) => row.translations.find((t) => t.languageCode === "nl")?.title ?? "",
            cell: ({ getValue }) => (
                <span className="font-display max-w-[200px] text-base font-medium tracking-tight break-words">
                    {String(getValue() || "—")}
                </span>
            ),
        },
        {
            id: "titleEn",
            header: "Titel (EN)",
            accessorFn: (row) => row.translations.find((t) => t.languageCode === "en")?.title ?? "",
            cell: ({ getValue }) => (
                <span className="text-muted-foreground max-w-[200px] break-words">
                    {String(getValue() || "—")}
                </span>
            ),
        },
        {
            id: "artistNl",
            header: "Artiest",
            accessorFn: (row) =>
                row.translations.find((t) => t.languageCode === "nl")?.artist ?? "",
            cell: ({ getValue }) => (
                <span className="max-w-[150px] break-words">{String(getValue() || "—")}</span>
            ),
        },
        {
            id: "slug",
            header: "Slug",
            accessorKey: "slug",
            cell: ({ getValue }) => (
                <code className="bg-foreground/5 text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
                    {String(getValue())}
                </code>
            ),
        },
        makeActionsColumn<Production>({
            label: "production",
            copyKey: "slug",
            onEdit: (p) => options.onEdit(toProductionRow(p)),
        }),
    ];
}
