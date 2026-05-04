"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, Plus } from "lucide-react";
import { RowSelectionState } from "@tanstack/react-table";

import { DataTable } from "../data-table";
import { makeArticleColumns } from "./columns";
import { ActionBar } from "../action-bar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SearchInput } from "@/components/cms/search-input";
import { useRouter } from "@/i18n/routing";
import { useDeleteArticle, useGetInfiniteArticlesCms } from "@/hooks/api/useArticles";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import type { PickerItem } from "@/lib/collection-picker-utils";
import { ArticleListItem } from "@/types/models/article.types";
import { CreateArticleDialog } from "./create-article-dialog";

export function ArticlesTable() {
    const t = useTranslations("Cms.Articles");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const locale = useLocale();
    const router = useRouter();
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const q = searchParams.get("q") ?? undefined;

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useGetInfiniteArticlesCms(q ? { q } : undefined);

    const articles = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { threshold: 0.1, rootMargin: "100px" }
        );
        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [loadMore]);

    const deleteArticle = useDeleteArticle();
    const [dialogOpen, setDialogOpen] = useState(false);

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
                t,
                locale
            ),
        [router, handleDelete, tActions, t, locale]
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
                <SearchInput placeholder={t("search")} />
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
                {hasNextPage && (
                    <div ref={loadMoreRef} className="flex justify-center py-4">
                        <Spinner className="text-muted-foreground h-5 w-5" />
                    </div>
                )}
            </div>
            <CollectionPickerDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                items={pickerItems}
            />
            <CreateArticleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
