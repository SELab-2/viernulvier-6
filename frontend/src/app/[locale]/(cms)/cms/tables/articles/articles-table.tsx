"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, Plus } from "lucide-react";
import { RowSelectionState } from "@tanstack/react-table";

import { DataTable } from "../data-table";
import { makeArticleColumns } from "./columns";
import { ActionBar } from "../action-bar";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useCreateArticle, useDeleteArticle, useGetArticlesCms } from "@/hooks/api/useArticles";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import type { PickerItem } from "@/lib/collection-picker-utils";
import { ArticleListItem } from "@/types/models/article.types";

export function ArticlesTable() {
    const t = useTranslations("Cms.Articles");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const router = useRouter();
    const { data: articles = [], isLoading } = useGetArticlesCms();
    const createArticle = useCreateArticle();
    const deleteArticle = useDeleteArticle();

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

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

    const selectedArticles = useMemo(
        () => articles.filter((a) => rowSelection[a.id]),
        [articles, rowSelection]
    );

    const pickerItems = useMemo<PickerItem[]>(
        () =>
            selectedArticles.map((a) => ({
                contentId: a.id,
                contentType: "blogpost" as const,
                label: a.slug ?? a.id,
            })),
        [selectedArticles]
    );

    const bulkActions = useMemo(
        () => [
            {
                key: "add-to-collection",
                label: tCollections("addToCollection"),
                icon: <Archive className="h-3.5 w-3.5" />,
                onClick: () => setCollectionDialogOpen(true),
            },
        ],
        [tCollections]
    );

    const handleNew = () => {
        createArticle.mutate(
            { title: undefined },
            {
                onSuccess: (article) => {
                    router.push(`/cms/articles/${article.id}/edit`);
                },
                onError: () => {
                    toast.error(t("createFailed"));
                },
            }
        );
    };

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2 py-2">
                <ActionBar
                    entityCounts={[
                        { countKey: "articlesSelected", count: selectedArticles.length },
                    ]}
                    actions={bulkActions}
                    onClear={() => setRowSelection({})}
                />
                <Button onClick={handleNew} disabled={createArticle.isPending} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("newArticle")}
                </Button>
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={columns}
                    data={articles}
                    loading={isLoading}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(row) => row.id}
                />
            </div>
            <CollectionPickerDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                items={pickerItems}
            />
        </div>
    );
}
