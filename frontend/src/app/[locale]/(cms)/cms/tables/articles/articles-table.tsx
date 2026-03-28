"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { DataTable } from "../data-table";
import { makeArticleColumns } from "./columns";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useCreateArticle, useGetArticlesCms } from "@/hooks/api/useArticles";

export function ArticlesTable() {
    const t = useTranslations("Cms.Articles");
    const router = useRouter();
    const { data: articles = [], isLoading } = useGetArticlesCms();
    const createArticle = useCreateArticle();

    const columns = useMemo(
        () => makeArticleColumns((article) => router.push(`/cms/articles/${article.id}/edit`)),
        [router]
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
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleNew} disabled={createArticle.isPending} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("newArticle")}
                </Button>
            </div>
            <DataTable columns={columns} data={articles} loading={isLoading} />
        </div>
    );
}
