"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import { CollectionPickerSubmenu } from "@/components/cms/collection-picker-submenu";
import { Action, ActionDisplay } from "@/types/cms/actions";
import type {
    Production,
    ProductionRow,
    ProductionUpdateInput,
} from "@/types/models/production.types";

export function getProductionFields(
    t: ReturnType<typeof useTranslations<"Cms.Productions">>
): FieldDef<ProductionRow>[] {
    return [
        { key: "slug", label: t("fieldSlug"), type: "text", readOnly: true },
        { key: "titleNl", label: `${t("fieldTitle")} (NL)`, type: "text" },
        { key: "titleEn", label: `${t("fieldTitle")} (EN)`, type: "text" },
        { key: "artistNl", label: `${t("fieldArtist")} (NL)`, type: "text" },
        { key: "artistEn", label: `${t("fieldArtist")} (EN)`, type: "text" },
        { key: "supertitleNl", label: `${t("fieldSupertitle")} (NL)`, type: "text" },
        { key: "supertitleEn", label: `${t("fieldSupertitle")} (EN)`, type: "text" },
        { key: "taglineNl", label: `${t("fieldTagline")} (NL)`, type: "text" },
        { key: "taglineEn", label: `${t("fieldTagline")} (EN)`, type: "text" },
        { key: "teaserNl", label: `${t("fieldTeaser")} (NL)`, type: "text" },
        { key: "teaserEn", label: `${t("fieldTeaser")} (EN)`, type: "text" },
        { key: "descriptionShortNl", label: `${t("fieldDescriptionShort")} (NL)`, type: "text" },
        { key: "descriptionShortEn", label: `${t("fieldDescriptionShort")} (EN)`, type: "text" },
        { key: "descriptionNl", label: `${t("fieldDescription")} (NL)`, type: "text" },
        { key: "descriptionEn", label: `${t("fieldDescription")} (EN)`, type: "text" },
        { key: "quoteNl", label: `${t("fieldQuote")} (NL)`, type: "text" },
        { key: "quoteEn", label: `${t("fieldQuote")} (EN)`, type: "text" },
        { key: "quoteSourceNl", label: `${t("fieldQuoteSource")} (NL)`, type: "text" },
        { key: "quoteSourceEn", label: `${t("fieldQuoteSource")} (EN)`, type: "text" },
        { key: "video1", label: t("fieldVideo1"), type: "text" },
        { key: "video2", label: t("fieldVideo2"), type: "text" },
        { key: "eticketInfo", label: t("fieldEticketInfo"), type: "text" },
        { key: "uitdatabankTheme", label: t("fieldUitdatabankTheme"), type: "text" },
        { key: "uitdatabankType", label: t("fieldUitdatabankType"), type: "text" },
    ];
}

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
    onEdit: (production: Production) => void;
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>;
    tProductions: ReturnType<typeof useTranslations<"Cms.Productions">>;
}): ColumnDef<Production>[] {
    const { onEdit, t, tProductions } = options;

    const actions: Action<Production>[] = [
        {
            key: "edit",
            label: t("edit", { label: "production" }),
            icon: SquarePen,
            display: ActionDisplay.Inline,
            onClick: (p) => onEdit(p),
        },
        {
            key: "copy-slug",
            label: t("copy", { key: "slug" }),
            onClick: async (p) => {
                try {
                    await navigator.clipboard.writeText(p.slug);
                    toast.success(t("copied", { key: "slug" }));
                } catch {
                    toast.error(t("copyFailed"));
                }
            },
        },
        {
            key: "add-to-collection",
            render: (production, closeMenu) => (
                <CollectionPickerSubmenu
                    item={{
                        contentId: production.id,
                        contentType: "production",
                        label:
                            production.translations.find((t) => t.languageCode === "nl")?.title ??
                            production.translations.find((t) => t.languageCode === "en")?.title ??
                            production.slug,
                    }}
                    onComplete={closeMenu}
                />
            ),
        },
    ];

    return [
        {
            id: "titleNl",
            header: tProductions("titleNlColumn"),
            accessorFn: (row) => row.translations.find((t) => t.languageCode === "nl")?.title ?? "",
            cell: ({ getValue }) => (
                <span className="font-display text-sm tracking-tight">{getValue() as string}</span>
            ),
        },
        {
            id: "titleEn",
            header: tProductions("titleEnColumn"),
            accessorFn: (row) => row.translations.find((t) => t.languageCode === "en")?.title ?? "",
            cell: ({ getValue }) => (
                <span className="font-display text-sm tracking-tight">{getValue() as string}</span>
            ),
        },
        {
            id: "artistNl",
            header: tProductions("artistColumn"),
            accessorFn: (row) =>
                row.translations.find((t) => t.languageCode === "nl")?.artist ?? "",
            cell: ({ getValue }) => (
                <span className="font-body text-sm">{getValue() as string}</span>
            ),
        },
        {
            accessorKey: "slug",
            header: tProductions("fieldSlug"),
            cell: ({ getValue }) => (
                <span className="text-muted-foreground font-mono text-xs tracking-[0.02em]">
                    {getValue() as string}
                </span>
            ),
        },
        makeActionsColumn<Production>({ actions }),
    ];
}
