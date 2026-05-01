"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { DataTable } from "../data-table";
import { makeArticleColumns } from "./columns";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SearchInput } from "@/components/cms/search-input";
import { useRouter } from "@/i18n/routing";
import { useDeleteArticle, useGetInfiniteArticlesCms } from "@/hooks/api/useArticles";
import { ArticleListItem } from "@/types/models/article.types";
import { CreateArticleDialog } from "./create-article-dialog";

export function ArticlesTable() {
    const t = useTranslations("Cms.Articles");
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
            <div className="bg-background sticky top-0 z-10 flex items-center justify-between py-2">
                <SearchInput placeholder={t("search")} />
                <Button onClick={() => setDialogOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("newArticle")}
                </Button>
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable columns={columns} data={articles} loading={isLoading} />
                {hasNextPage && (
                    <div ref={loadMoreRef} className="flex justify-center py-4">
                        <Spinner className="text-muted-foreground h-5 w-5" />
                    </div>
                )}
            </div>
            <CreateArticleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
