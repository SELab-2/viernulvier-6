"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

import { ArticleMetadataPanel } from "@/components/cms/article-metadata-panel";
import { TiptapEditor } from "@/components/cms/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { usePreviewContext } from "@/contexts/PreviewContext";
import { CmsMobileMenu } from "@/components/cms";
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

    const article = useMemo(
        () => (fetchedArticle ? { ...fetchedArticle, ...edits } : null),
        [fetchedArticle, edits]
    );

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
            <div className="border-b px-4 py-3">
                <Input
                    value={article.title ?? ""}
                    onChange={(e) => patchArticle({ title: e.target.value || null })}
                    placeholder={t("title")}
                    className="h-9 max-w-xl"
                />
            </div>

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Editor */}
                <div
                    className={`flex flex-col overflow-hidden p-4 transition-all duration-300 ${
                        isPreviewOpen ? "hidden lg:flex lg:w-[35%] lg:flex-1" : "w-full flex-1"
                    }`}
                >
                    <TiptapEditor
                        content={article.content}
                        onChange={(json) => patchArticle({ content: json })}
                        placeholder="Write article content…"
                    />
                </div>

                {/* Metadata panel - always visible */}
                <aside
                    className={`shrink-0 overflow-y-auto border-t lg:w-64 lg:border-t-0 lg:border-l ${
                        isPreviewOpen ? "hidden lg:block" : "h-1/3 w-full lg:h-auto"
                    }`}
                >
                    <ArticleMetadataPanel
                        article={article}
                        relations={relations}
                        onArticleChange={patchArticle}
                        onRelationsChange={setRelationEdits}
                    />
                </aside>

                {/* Preview Panel - right side */}
                {isPreviewOpen && (
                    <div className="border-muted flex min-h-[70vh] w-full flex-1 flex-col overflow-hidden border-t lg:min-h-0 lg:w-[calc(100%-35%-16rem)] lg:min-w-[400px] lg:border-t-0 lg:border-l">
                        <div className="bg-muted flex items-center justify-between px-4 py-3 shadow-[0_1px_0_0_hsl(var(--border))]">
                            <span className="text-background font-mono text-[10px] font-medium tracking-[1.2px] uppercase">
                                {t("previewLabel")}
                            </span>
                        </div>
                        <div className="bg-background flex-1 overflow-auto">
                            <iframe
                                src={`/${locale}/articles/${article.slug}?preview=1&session=${previewSessionId}`}
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
