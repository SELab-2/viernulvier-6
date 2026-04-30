"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { DataTable } from "../data-table";
import { makeArticleColumns } from "./columns";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useDeleteArticle, useGetArticlesCms } from "@/hooks/api/useArticles";
import { ArticleListItem } from "@/types/models/article.types";
import { CreateArticleDialog } from "./create-article-dialog";

export function ArticlesTable() {
    const t = useTranslations("Cms.Articles");
    const router = useRouter();
    const { data: articles = [], isLoading } = useGetArticlesCms();
    const deleteArticle = useDeleteArticle();
    const [dialogOpen, setDialogOpen] = useState(false);

    const tActions = useTranslations("Cms.ActionsColumn");
    const handleDelete = useCallback(
        (article: ArticleListItem) => {
            const ok = window.confirm(t("deleteConfirm", { title: article.title || article.slug }));
            if (!ok) return;
            deleteArticle.mutate(article.id, {
                onSuccess: () => toast.success(t("deleteSuccess")),
                onError: () => toast.error(t("deleteError")),
            });
        },
        [deleteArticle, t]
    );

    const columns = useMemo(
        () =>
            makeArticleColumns(
                (article) => router.push(`/cms/articles/${article.id}/edit`),
                handleDelete,
                tActions,
                t
            ),
        [router, handleDelete, tActions, t]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 flex justify-end py-2">
                <Button onClick={() => setDialogOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("newArticle")}
                </Button>
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable columns={columns} data={articles} loading={isLoading} />
            </div>
            <CreateArticleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
