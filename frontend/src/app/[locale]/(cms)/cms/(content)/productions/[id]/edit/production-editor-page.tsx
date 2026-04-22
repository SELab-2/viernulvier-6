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
import { CmsMobileMenu } from "@/components/cms";
import { LanguageSelector } from "@/components/cms/language-selector";
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

function previewLocaleKey(sessionId: string) {
    return `cms_preview_locale:${sessionId}`;
}

interface FieldDef {
    key: string;
    label: string;
    type: "text" | "textarea";
    nlKey: keyof ProductionRow;
    enKey: keyof ProductionRow;
}

function getBilingualFields(t: ReturnType<typeof useTranslations<"Cms.Productions">>): FieldDef[] {
    return [
        { key: "title", label: t("fieldTitle"), type: "text", nlKey: "titleNl", enKey: "titleEn" },
        {
            key: "artist",
            label: t("fieldArtist"),
            type: "text",
            nlKey: "artistNl",
            enKey: "artistEn",
        },
        {
            key: "supertitle",
            label: t("fieldSupertitle"),
            type: "text",
            nlKey: "supertitleNl",
            enKey: "supertitleEn",
        },
        {
            key: "tagline",
            label: t("fieldTagline"),
            type: "text",
            nlKey: "taglineNl",
            enKey: "taglineEn",
        },
        {
            key: "teaser",
            label: t("fieldTeaser"),
            type: "textarea",
            nlKey: "teaserNl",
            enKey: "teaserEn",
        },
        {
            key: "descriptionShort",
            label: t("fieldDescriptionShort"),
            type: "textarea",
            nlKey: "descriptionShortNl",
            enKey: "descriptionShortEn",
        },
        {
            key: "description",
            label: t("fieldDescription"),
            type: "textarea",
            nlKey: "descriptionNl",
            enKey: "descriptionEn",
        },
        { key: "quote", label: t("fieldQuote"), type: "text", nlKey: "quoteNl", enKey: "quoteEn" },
        {
            key: "quoteSource",
            label: t("fieldQuoteSource"),
            type: "text",
            nlKey: "quoteSourceNl",
            enKey: "quoteSourceEn",
        },
    ];
}

function getGeneralFields(t: ReturnType<typeof useTranslations<"Cms.Productions">>): Array<{
    key: keyof ProductionRow;
    label: string;
    type: "text";
    readOnly?: boolean;
}> {
    return [
        { key: "slug", label: t("fieldSlug"), type: "text", readOnly: true },
        { key: "video1", label: t("fieldVideo1"), type: "text" },
        { key: "video2", label: t("fieldVideo2"), type: "text" },
        { key: "eticketInfo", label: t("fieldEticketInfo"), type: "text" },
        { key: "uitdatabankTheme", label: t("fieldUitdatabankTheme"), type: "text" },
        { key: "uitdatabankType", label: t("fieldUitdatabankType"), type: "text" },
    ];
}

export function ProductionEditorPage({ id }: ProductionEditorPageProps) {
    const t = useTranslations("Cms.Productions");
    const tCommon = useTranslations("Cms.common");
    const locale = useLocale();
    const { setPreview, clearPreviewFor } = usePreviewContext();

    const { data: fetchedProduction, isLoading: productionLoading } = useGetProduction(id);
    const { data: eventsResult } = useGetEvents();
    const updateProduction = useUpdateProduction();

    const [edits, setEdits] = useState<Partial<ProductionRow>>({});
    const [isPreviewOpen, setIsPreviewOpen] = useState(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            return true;
        }
        return false;
    });
    const [previewSessionId] = useState(() => {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    });
    const [activeLang, setActiveLang] = useState<Lang>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(previewLocaleKey(previewSessionId));
            if (saved === "nl" || saved === "en") return saved;
        }
        return locale as Lang;
    });

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

    // Ref for preview iframe
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const localeChangeSourceRef = useRef<"editor" | "storage" | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const key = previewLocaleKey(previewSessionId);
        const handleStorage = (event: StorageEvent) => {
            if (event.key === key) {
                const next = event.newValue;
                if (next === "nl" || next === "en") {
                    localeChangeSourceRef.current = "storage";
                    setActiveLang(next);
                }
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [previewSessionId]);

    const handleLangChange = useCallback(
        (nextLang: Lang) => {
            localeChangeSourceRef.current = "editor";
            setActiveLang(nextLang);
            localStorage.setItem(previewLocaleKey(previewSessionId), nextLang);
        },
        [previewSessionId]
    );

    // Update iframe src only when the editor initiated the locale change
    useEffect(() => {
        if (!iframeRef.current || !isPreviewOpen || !production?.id) return;
        if (localeChangeSourceRef.current === "storage") {
            localeChangeSourceRef.current = null;
            return;
        }
        const expectedPath = `/${activeLang}/productions/${production.id}?preview=1&session=${previewSessionId}`;
        const currentPath = iframeRef.current.src
            ? new URL(iframeRef.current.src).pathname + new URL(iframeRef.current.src).search
            : "";
        if (currentPath !== expectedPath) {
            iframeRef.current.src = expectedPath;
        }
        localeChangeSourceRef.current = null;
    }, [activeLang, isPreviewOpen, production?.id, previewSessionId]);

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
        setPreview("production", production.id, previewData, locale, previewSessionId);
    }, [production, productionEvents, isPreviewOpen, setPreview, locale, previewSessionId]);

    // Clean up preview data when the editor unmounts
    useEffect(() => {
        return () => {
            clearPreviewFor("production", id, previewSessionId);
        };
    }, [id, previewSessionId, clearPreviewFor]);

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
            setPreview("production", production.id, previewData, locale, previewSessionId);
        }
        setIsPreviewOpen((prev) => !prev);
    }, [production, productionEvents, isPreviewOpen, setPreview, locale, previewSessionId]);

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
        <div className="flex h-full flex-col overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-2 lg:hidden">
                    <CmsMobileMenu />
                </div>
                <Link
                    href="/cms/productions"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("backToList")}</span>
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
                            <span className="hidden sm:inline">{t("hidePreview")}</span>
                        </>
                    ) : (
                        <>
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">{t("preview")}</span>
                        </>
                    )}
                    {!isPreviewOpen && hasChanges && (
                        <span className="bg-primary h-2 w-2 rounded-full" />
                    )}
                </Button>
                <Button onClick={handleSave} disabled={isSaving} size="sm">
                    <Save className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                        {isSaving ? tCommon("saving") : tCommon("save")}
                    </span>
                </Button>
            </div>

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Editor */}
                <div
                    className={`flex flex-col overflow-hidden transition-all duration-300 ${
                        isPreviewOpen
                            ? "hidden lg:flex lg:w-[45%] lg:flex-1"
                            : "w-full lg:mx-auto lg:max-w-3xl lg:flex-1"
                    }`}
                >
                    {/* Form fields */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-8">
                            {/* General Fields Section */}
                            <section className="space-y-4">
                                <h2 className="border-foreground/10 border-b pb-2 text-sm font-semibold">
                                    {t("generalSection")}
                                </h2>
                                <div className="grid gap-4">
                                    {getGeneralFields(t).map((field) => (
                                        <div key={field.key}>
                                            <label className="mb-2 block text-sm font-medium">
                                                {field.label}
                                                {field.readOnly && (
                                                    <span className="text-muted-foreground ml-2 text-xs">
                                                        ({t("readOnly")})
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
                                    <h2 className="text-sm font-semibold">{t("contentSection")}</h2>
                                    <LanguageSelector
                                        activeLang={activeLang}
                                        onChange={handleLangChange}
                                    />
                                </div>

                                {/* Fields for active language */}
                                <div className="space-y-5">
                                    {getBilingualFields(t).map((field) => {
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
                    <div className="border-muted flex min-h-[70vh] w-full flex-1 flex-col overflow-hidden border-t lg:min-h-0 lg:w-[55%] lg:min-w-[400px] lg:border-t-0 lg:border-l">
                        <div className="bg-muted flex items-center justify-between px-4 py-3 shadow-[0_1px_0_0_hsl(var(--border))]">
                            <span className="text-background font-mono text-[10px] font-medium tracking-[1.2px] uppercase">
                                {t("previewLabel")}
                            </span>
                        </div>
                        <div className="bg-background flex-1 overflow-auto">
                            <iframe
                                ref={iframeRef}
                                className="bg-background h-full w-full"
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
