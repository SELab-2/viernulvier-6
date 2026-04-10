"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { usePreviewContext } from "@/contexts/PreviewContext";
import { useGetProduction, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents } from "@/hooks/api/useEvents";
import { ProductionRow } from "@/types/models/production.types";
import { ProductionPreviewData } from "@/types/production-preview.types";
import { toProductionRow, toProductionUpdateInput } from "../../../../tables/productions/columns";
import { convertProductionRowToProduction } from "@/lib/production-converter";

interface ProductionEditorPageProps {
    id: string;
}

type Lang = "nl" | "en";

interface FieldDef {
    key: string;
    label: string;
    type: "text" | "textarea";
    nlKey: keyof ProductionRow;
    enKey: keyof ProductionRow;
}

const BILINGUAL_FIELDS: FieldDef[] = [
    { key: "title", label: "Title", type: "text", nlKey: "titleNl", enKey: "titleEn" },
    { key: "artist", label: "Artist", type: "text", nlKey: "artistNl", enKey: "artistEn" },
    {
        key: "supertitle",
        label: "Supertitle",
        type: "text",
        nlKey: "supertitleNl",
        enKey: "supertitleEn",
    },
    { key: "tagline", label: "Tagline", type: "text", nlKey: "taglineNl", enKey: "taglineEn" },
    { key: "teaser", label: "Teaser", type: "textarea", nlKey: "teaserNl", enKey: "teaserEn" },
    {
        key: "descriptionShort",
        label: "Short Description",
        type: "textarea",
        nlKey: "descriptionShortNl",
        enKey: "descriptionShortEn",
    },
    {
        key: "description",
        label: "Description",
        type: "textarea",
        nlKey: "descriptionNl",
        enKey: "descriptionEn",
    },
    { key: "quote", label: "Quote", type: "text", nlKey: "quoteNl", enKey: "quoteEn" },
    {
        key: "quoteSource",
        label: "Quote Source",
        type: "text",
        nlKey: "quoteSourceNl",
        enKey: "quoteSourceEn",
    },
];

const GENERAL_FIELDS: Array<{
    key: keyof ProductionRow;
    label: string;
    type: "text";
    readOnly?: boolean;
}> = [
    { key: "slug", label: "Slug", type: "text", readOnly: true },
    { key: "video1", label: "Video 1", type: "text" },
    { key: "video2", label: "Video 2", type: "text" },
    { key: "eticketInfo", label: "E-ticket Info", type: "text" },
    { key: "uitdatabankTheme", label: "UiTdatabank Theme", type: "text" },
    { key: "uitdatabankType", label: "UiTdatabank Type", type: "text" },
];

export function ProductionEditorPage({ id }: ProductionEditorPageProps) {
    const t = useTranslations("Cms.Productions");
    const locale = useLocale();
    const { setPreview, clearPreviewFor } = usePreviewContext();

    const { data: fetchedProduction, isLoading: productionLoading } = useGetProduction(id);
    const { data: eventsResult } = useGetEvents();
    const updateProduction = useUpdateProduction();

    const [edits, setEdits] = useState<Partial<ProductionRow>>({});
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [activeLang, setActiveLang] = useState<Lang>("nl");

    // Convert API production to ProductionRow format
    const baseProduction = useMemo(() => {
        if (!fetchedProduction) return null;
        return toProductionRow(fetchedProduction);
    }, [fetchedProduction]);

    // Merge base with edits
    const production = useMemo(() => {
        if (!baseProduction) return null;
        return { ...baseProduction, ...edits };
    }, [baseProduction, edits]);

    // Ref to track last synced production hash for preview
    const lastSyncedProductionRef = useRef<string | null>(null);

    // Get events for this production
    const productionEvents = useMemo(() => {
        if (!eventsResult?.data || !id) return [];
        return eventsResult.data.filter((e) => e.productionId === id);
    }, [eventsResult, id]);

    // Sync preview data to localStorage whenever production changes and preview is open
    useEffect(() => {
        if (!production || !isPreviewOpen) return;

        // Create a hash of the current production to check if it changed
        const productionHash = JSON.stringify(production);
        if (productionHash === lastSyncedProductionRef.current) return;

        lastSyncedProductionRef.current = productionHash;
        const productionForPreview = convertProductionRowToProduction(production);
        const previewData: ProductionPreviewData = {
            production: productionForPreview,
            events: productionEvents,
        };
        setPreview("production", production.id, previewData, locale);
    }, [production, productionEvents, isPreviewOpen, setPreview, locale]);

    const handleSave = async () => {
        if (!production) return;

        try {
            const updateInput = toProductionUpdateInput(production);
            await updateProduction.mutateAsync(updateInput);
            clearPreviewFor("production", production.id);
            setEdits({});
            toast.success(t("saveSuccess"));
        } catch {
            toast.error(t("saveFailed"));
        }
    };

    const togglePreview = useCallback(() => {
        if (!production) return;

        if (!isPreviewOpen) {
            const productionForPreview = convertProductionRowToProduction(production);
            const previewData: ProductionPreviewData = {
                production: productionForPreview,
                events: productionEvents,
            };
            setPreview("production", production.id, previewData, locale);
        }
        setIsPreviewOpen((prev) => !prev);
    }, [production, productionEvents, isPreviewOpen, setPreview, locale]);

    const handleChange = (key: keyof ProductionRow, value: string | null) => {
        setEdits((prev) => ({ ...prev, [key]: value }));
    };

    if (productionLoading || !production) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const isSaving = updateProduction.isPending;
    const hasChanges = Object.keys(edits).length > 0;

    return (
        <div className="flex h-full flex-col">
            {/* Top bar */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <Link
                    href="/cms/productions"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t("backToList")}
                </Link>
                <div className="flex-1" />
                <Button
                    variant={isPreviewOpen ? "secondary" : "outline"}
                    size="sm"
                    onClick={togglePreview}
                    className="gap-2"
                >
                    {isPreviewOpen ? (
                        <>
                            <EyeOff className="h-4 w-4" />
                            {t("hidePreview")}
                        </>
                    ) : (
                        <>
                            <Eye className="h-4 w-4" />
                            {t("preview")}
                        </>
                    )}
                    {!isPreviewOpen && hasChanges && (
                        <span className="bg-primary h-2 w-2 rounded-full" />
                    )}
                </Button>
                <Button onClick={handleSave} disabled={isSaving} size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? t("saving") : t("save")}
                </Button>
            </div>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Editor */}
                <div
                    className={`flex flex-col overflow-hidden transition-all duration-300 ${
                        isPreviewOpen ? "w-[45%]" : "mx-auto max-w-3xl flex-1"
                    }`}
                >
                    {/* Form fields */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-8">
                            {/* General Fields Section */}
                            <section className="space-y-4">
                                <h2 className="border-foreground/10 border-b pb-2 text-sm font-semibold">
                                    General
                                </h2>
                                <div className="grid gap-4">
                                    {GENERAL_FIELDS.map((field) => (
                                        <div key={field.key}>
                                            <label className="mb-2 block text-sm font-medium">
                                                {field.label}
                                                {field.readOnly && (
                                                    <span className="text-muted-foreground ml-2 text-xs">
                                                        (read-only)
                                                    </span>
                                                )}
                                            </label>
                                            <Input
                                                value={(production[field.key] as string) ?? ""}
                                                onChange={(e) =>
                                                    handleChange(field.key, e.target.value || null)
                                                }
                                                disabled={field.readOnly}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Bilingual Fields Section */}
                            <section className="space-y-4">
                                <div className="border-foreground/10 flex items-center justify-between border-b pb-2">
                                    <h2 className="text-sm font-semibold">Content</h2>
                                    {/* Language selector */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setActiveLang("nl")}
                                            className={`px-3 py-1 text-xs font-medium transition-colors ${
                                                activeLang === "nl"
                                                    ? "bg-foreground text-background"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            Dutch
                                        </button>
                                        <button
                                            onClick={() => setActiveLang("en")}
                                            className={`px-3 py-1 text-xs font-medium transition-colors ${
                                                activeLang === "en"
                                                    ? "bg-foreground text-background"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            English
                                        </button>
                                    </div>
                                </div>

                                {/* Fields for active language */}
                                <div className="space-y-5">
                                    {BILINGUAL_FIELDS.map((field) => {
                                        const fieldKey =
                                            activeLang === "nl" ? field.nlKey : field.enKey;
                                        return (
                                            <div key={field.key}>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {field.label}
                                                </label>
                                                {field.type === "textarea" ? (
                                                    <Textarea
                                                        value={
                                                            (production[fieldKey] as string) ?? ""
                                                        }
                                                        onChange={(e) =>
                                                            handleChange(
                                                                fieldKey,
                                                                e.target.value || null
                                                            )
                                                        }
                                                        className="min-h-[100px] resize-y text-sm"
                                                    />
                                                ) : (
                                                    <Input
                                                        value={
                                                            (production[fieldKey] as string) ?? ""
                                                        }
                                                        onChange={(e) =>
                                                            handleChange(
                                                                fieldKey,
                                                                e.target.value || null
                                                            )
                                                        }
                                                        className="h-9 text-sm"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Preview Panel - right side */}
                {isPreviewOpen && (
                    <div className="border-muted w-[55%] min-w-[400px] shrink-0 overflow-hidden border-l">
                        <div className="bg-muted flex items-center justify-between px-4 py-3 shadow-[0_1px_0_0_hsl(var(--border))]">
                            <span className="text-background font-mono text-[10px] font-medium tracking-[1.2px] uppercase">
                                {t("previewLabel")}
                            </span>
                        </div>
                        <div className="h-[calc(100%-45px)] overflow-auto bg-white">
                            <iframe
                                src={`/${locale}/productions/${production.id}?preview=1`}
                                className="h-full w-full"
                                title={t("previewLabel")}
                                sandbox="allow-same-origin allow-scripts"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
