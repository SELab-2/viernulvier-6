"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, Plus, Tags, Trash2 } from "lucide-react";
import { RowSelectionState } from "@tanstack/react-table";

import { DataTable } from "../data-table";
import { makeArticleColumns } from "./columns";
import { ActionBar } from "../action-bar";
import { Button } from "@/components/ui/button";
import { LoadMoreSentinel } from "@/components/cms/load-more-sentinel";
import { SearchInput } from "@/components/cms/search-input";
import { getCmsFacetParams } from "@/lib/cms-filter-params";
import { useRouter } from "@/i18n/routing";
import { useDeleteArticle, useGetInfiniteArticlesCms } from "@/hooks/api/useArticles";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { BulkTagDialog } from "@/components/cms/bulk-tag-dialog";
import type { PickerItem } from "@/lib/collection-picker-utils";
import { ArticleListItem } from "@/types/models/article.types";
import { ActionVariant } from "@/types/cms/actions";
import { CreateArticleDialog } from "./create-article-dialog";

export function ArticlesTable() {
    const t = useTranslations("Cms.Articles");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const tActionBar = useTranslations("Cms.ActionBar");
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const q = searchParams.get("q") ?? undefined;
    const facetParams = useMemo(
        () => getCmsFacetParams(new URLSearchParams(searchParams.toString())),
        [searchParams]
    );

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isLoading,
    } = useGetInfiniteArticlesCms({ limit: 50, ...(q ? { q } : {}), ...facetParams });

    const articles = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const deleteArticle = useDeleteArticle();
    const [dialogOpen, setDialogOpen] = useState(false);

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
    const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);

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
                t,
                locale
            ),
        [router, handleDelete, tActions, t, locale]
    );

    const selectedArticles = useMemo(
        () => articles.filter((a) => rowSelection[a.id]),
        [articles, rowSelection]
    );

    const handleBulkDelete = useCallback(() => {
        if (selectedArticles.length === 0) return;
        const ok = window.confirm(tActionBar("delete") + ` ${selectedArticles.length} article(s)?`);
        if (!ok) return;
        for (const article of selectedArticles) {
            deleteArticle.mutate(article.id);
        }
        setRowSelection({});
    }, [selectedArticles, deleteArticle, tActionBar]);

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
            {
                key: "bulk-tags",
                label: tActionBar("bulkEdit"),
                icon: <Tags className="h-3.5 w-3.5" />,
                onClick: () => setBulkTagDialogOpen(true),
            },
            {
                key: "bulk-delete",
                label: tActionBar("delete"),
                icon: <Trash2 className="h-3.5 w-3.5" />,
                variant: ActionVariant.Destructive,
                onClick: handleBulkDelete,
            },
        ],
        [tCollections, tActionBar, handleBulkDelete]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 flex items-center gap-2">
                <ActionBar
                    entityCounts={[
                        { countKey: "articlesSelected", count: selectedArticles.length },
                    ]}
                    actions={bulkActions}
                    onClear={() => setRowSelection({})}
                    search={<SearchInput placeholder={t("search")} />}
                    className="flex-1"
                />
                <Button onClick={() => setDialogOpen(true)} size="sm">
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
                <LoadMoreSentinel hasNextPage={hasNextPage ?? false} onLoadMore={fetchNextPage} />
            </div>
            <CollectionPickerDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                items={pickerItems}
            />
            <BulkTagDialog
                open={bulkTagDialogOpen}
                onOpenChange={setBulkTagDialogOpen}
                entityType="article"
                entityIds={selectedArticles.map((article) => article.id)}
                onApplied={() => setRowSelection({})}
            />
            <CreateArticleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
