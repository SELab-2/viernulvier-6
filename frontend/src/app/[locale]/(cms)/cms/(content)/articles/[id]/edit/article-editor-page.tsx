"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { ArticleMetadataPanel } from "@/components/cms/article-metadata-panel";
import { TiptapEditor } from "@/components/cms/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import {
    useGetArticle,
    useGetArticleRelations,
    useUpdateArticle,
    useUpdateArticleRelations,
} from "@/hooks/api/useArticles";
import { Article, ArticleRelations } from "@/types/models/article.types";

interface ArticleEditorPageProps {
    id: string;
}

export function ArticleEditorPage({ id }: ArticleEditorPageProps) {
    const t = useTranslations("Cms.Articles");
    const { data: fetchedArticle, isLoading: articleLoading } = useGetArticle(id);
    const { data: fetchedRelations, isLoading: relationsLoading } = useGetArticleRelations(id);
    const updateArticle = useUpdateArticle();
    const updateRelations = useUpdateArticleRelations(id);

    const [edits, setEdits] = useState<Partial<Article>>({});
    const [relationEdits, setRelationEdits] = useState<ArticleRelations | null>(null);

    const article = fetchedArticle ? { ...fetchedArticle, ...edits } : null;
    const relations = relationEdits ??
        fetchedRelations ?? {
            productionIds: [],
            artistIds: [],
            locationIds: [],
            eventIds: [],
        };

    const handleSave = async () => {
        if (!article) return;

        try {
            await Promise.all([
                updateArticle.mutateAsync(article),
                updateRelations.mutateAsync(relations),
            ]);
            toast.success(t("saveSuccess"));
        } catch {
            toast.error(t("saveFailed"));
        }
    };

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

    return (
        <div className="flex h-full flex-col">
            {/* Top bar */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <Link
                    href="/cms/articles"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t("backToList")}
                </Link>
                <div className="flex-1" />
                <Button onClick={handleSave} disabled={isSaving} size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? t("saving") : t("save")}
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
            <div className="flex flex-1 overflow-hidden">
                {/* Editor */}
                <div className="flex flex-1 flex-col overflow-hidden p-4">
                    <TiptapEditor
                        content={article.content}
                        onChange={(json) => patchArticle({ content: json })}
                        placeholder="Write article content…"
                        entityType="article"
                        entityId={id}
                    />
                </div>

                {/* Metadata panel */}
                <aside className="w-72 shrink-0 overflow-y-auto border-l">
                    <ArticleMetadataPanel
                        article={article}
                        relations={relations}
                        onArticleChange={patchArticle}
                        onRelationsChange={setRelationEdits}
                    />
                </aside>
            </div>
        </div>
    );
}
