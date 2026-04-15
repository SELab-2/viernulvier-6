"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Eye, EyeOff, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { ArticleMetadataPanel } from "@/components/cms/article-metadata-panel";
import { TiptapEditor } from "@/components/cms/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { usePreviewContext } from "@/contexts/PreviewContext";
import { CmsMobileMenu } from "@/components/cms";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
    useGetArticle,
    useGetArticleRelations,
    useUpdateArticle,
    useUpdateArticleRelations,
} from "@/hooks/api/useArticles";
import { Article, ArticleRelations } from "@/types/models/article.types";
import { ArticlePreviewData } from "@/types/article-preview.types";

interface ArticleEditorPageProps {
    id: string;
}

export function ArticleEditorPage({ id }: ArticleEditorPageProps) {
    const t = useTranslations("Cms.Articles");
    const locale = useLocale();
    const { setPreview, clearPreviewFor } = usePreviewContext();

    const { data: fetchedArticle, isLoading: articleLoading } = useGetArticle(id);
    const { data: fetchedRelations, isLoading: relationsLoading } = useGetArticleRelations(id);
    const updateArticle = useUpdateArticle();
    const updateRelations = useUpdateArticleRelations(id);

    const [edits, setEdits] = useState<Partial<Article>>({});
    const [relationEdits, setRelationEdits] = useState<ArticleRelations | null>(null);
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

    const [previewLocale, setPreviewLocale] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`cms_preview_locale:${previewSessionId}`);
            if (saved === "nl" || saved === "en") return saved;
        }
        return locale;
    });

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const previewLocaleRef = useRef<string>(previewLocale);
    useEffect(() => {
        previewLocaleRef.current = previewLocale;
    }, [previewLocale]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const key = `cms_preview_locale:${previewSessionId}`;
        const handleStorage = (event: StorageEvent) => {
            if (event.key === key) {
                const next = event.newValue;
                if (next === "nl" || next === "en") {
                    setPreviewLocale(next);
                }
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [previewSessionId]);

    const article = useMemo(
        () => (fetchedArticle ? { ...fetchedArticle, ...edits } : null),
        [fetchedArticle, edits]
    );

    // Set iframe src when preview opens or article slug changes
    useEffect(() => {
        if (!iframeRef.current || !isPreviewOpen || !article) return;
        const expectedPath = `/${previewLocaleRef.current}/articles/${article.slug}?preview=1&session=${previewSessionId}`;
        const currentPath = iframeRef.current.src
            ? new URL(iframeRef.current.src).pathname + new URL(iframeRef.current.src).search
            : "";
        if (currentPath !== expectedPath) {
            iframeRef.current.src = expectedPath;
        }
    }, [isPreviewOpen, article?.slug, previewSessionId]);

    const relations = useMemo(
        () =>
            relationEdits ??
            fetchedRelations ?? {
                productionIds: [],
                artistIds: [],
                locationIds: [],
                eventIds: [],
            },
        [relationEdits, fetchedRelations]
    );

    // Sync preview data to localStorage whenever data changes and preview is open
    useEffect(() => {
        if (article && isPreviewOpen) {
            const previewData: ArticlePreviewData = { article, relations };
            setPreview("article", article.slug, previewData, locale, previewSessionId);
        }
    }, [article, relations, isPreviewOpen, setPreview, locale, previewSessionId]);

    // Clean up preview data when the editor unmounts
    useEffect(() => {
        return () => {
            if (article) {
                clearPreviewFor("article", article.slug, previewSessionId);
            }
        };
    }, [article, previewSessionId, clearPreviewFor]);

    const handleSave = async () => {
        if (!article) return;

        try {
            await Promise.all([
                updateArticle.mutateAsync(article),
                updateRelations.mutateAsync(relations),
            ]);
            // Clear preview after successful save
            clearPreviewFor("article", article.slug, previewSessionId);
            toast.success(t("saveSuccess"));
        } catch {
            toast.error(t("saveFailed"));
        }
    };

    const togglePreview = useCallback(() => {
        if (!article) return;

        if (!isPreviewOpen) {
            // Opening preview - set initial data with both article and relations
            const previewData: ArticlePreviewData = { article, relations };
            setPreview("article", article.slug, previewData, locale, previewSessionId);
        }
        setIsPreviewOpen((prev) => !prev);
    }, [article, relations, isPreviewOpen, setPreview, locale, previewSessionId]);

    const patchArticle = (patch: Partial<Article>) => {
        setEdits((prev) => ({ ...prev, ...patch }));
    };

    if (articleLoading || relationsLoading || !article) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const isSaving = updateArticle.isPending || updateRelations.isPending;
    const hasChanges = Object.keys(edits).length > 0 || relationEdits !== null;

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-2 lg:hidden">
                    <CmsMobileMenu />
                </div>
                <Link
                    href="/cms/articles"
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
                    disabled={!article.slug}
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
                    <span className="hidden sm:inline">{isSaving ? t("saving") : t("save")}</span>
                </Button>
            </div>

            {/* Title input */}
            <div className={`border-b px-4 py-3 ${isPreviewOpen ? "hidden lg:block" : ""}`}>
                <Input
                    value={article.title ?? ""}
                    onChange={(e) => patchArticle({ title: e.target.value || null })}
                    placeholder={t("title")}
                    className="h-9 max-w-xl"
                />
            </div>

            {/* Main content area */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Editor */}
                <div
                    className={`flex min-h-0 flex-col overflow-hidden p-4 transition-all duration-300 ${
                        isPreviewOpen
                            ? "hidden lg:flex lg:h-full lg:w-[35%] lg:flex-1"
                            : "h-full w-full flex-1"
                    }`}
                >
                    <TiptapEditor
                        content={article.content}
                        onChange={(json) => patchArticle({ content: json })}
                        placeholder={t("contentPlaceholder")}
                    />
                </div>

                {/* Desktop Metadata panel */}
                <aside className="hidden shrink-0 overflow-y-auto border-t lg:block lg:h-full lg:w-64 lg:border-t-0 lg:border-l">
                    <ArticleMetadataPanel
                        article={article}
                        relations={relations}
                        onArticleChange={patchArticle}
                        onRelationsChange={setRelationEdits}
                    />
                </aside>

                {/* Mobile Metadata panel in Sheet */}
                <div className={`lg:hidden ${isPreviewOpen ? "hidden" : ""}`}>
                    <Sheet>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                className="border-border text-muted-foreground hover:text-foreground bg-background fixed right-4 bottom-4 z-40 flex cursor-pointer items-center gap-2 border px-4 py-2.5 font-mono text-[10px] tracking-[1.4px] uppercase shadow-lg transition-colors"
                            >
                                <Settings2 className="h-3.5 w-3.5" />
                                {t("metadata")}
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[85vw] p-0 sm:max-w-sm">
                            <SheetHeader className="border-b px-4 py-3">
                                <SheetTitle className="font-display text-lg font-bold tracking-tight">
                                    {t("metadata")}
                                </SheetTitle>
                            </SheetHeader>
                            <div className="h-[calc(100%-60px)] overflow-y-auto">
                                <ArticleMetadataPanel
                                    article={article}
                                    relations={relations}
                                    onArticleChange={patchArticle}
                                    onRelationsChange={setRelationEdits}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Preview Panel - right side */}
                {isPreviewOpen && (
                    <div className="border-muted flex h-full w-full flex-1 flex-col overflow-hidden border-t lg:min-h-0 lg:w-[calc(100%-35%-16rem)] lg:min-w-[400px] lg:border-t-0 lg:border-l">
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
