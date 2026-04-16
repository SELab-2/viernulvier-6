"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Article, ArticleStatus } from "@/types/models/article.types";
import { statusStyles } from "@/components/cms/status-badge";
import { cn } from "@/lib/utils";

interface ArticleMetadataPanelProps {
    article: Article;
    onArticleChange: (patch: Partial<Article>) => void;
}

export function ArticleMetadataPanel({ article, onArticleChange }: ArticleMetadataPanelProps) {
    const t = useTranslations("Cms.Articles");

    return (
        <div className="space-y-5 p-4">
            {/* Status */}
            <div className="space-y-1">
                <Label className="text-xs font-medium">{t("statusLabel")}</Label>
                <Select
                    value={article.status}
                    onValueChange={(v) => onArticleChange({ status: v as ArticleStatus })}
                >
                    <SelectTrigger
                        className={cn(
                            "h-8 text-xs font-medium capitalize",
                            statusStyles[article.status]
                        )}
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Slug */}
            <div className="space-y-1">
                <Label htmlFor="slug" className="text-xs font-medium">
                    {t("slug")}
                </Label>
                <Input
                    id="slug"
                    value={article.slug}
                    onChange={(e) => onArticleChange({ slug: e.target.value })}
                    className="h-8 font-mono text-xs"
                />
            </div>

            {/* Subject period */}
            <div className="space-y-1">
                <Label className="text-xs font-medium">{t("subjectPeriod")}</Label>
                <div className="flex flex-col gap-1">
                    <Input
                        type="date"
                        value={article.subjectPeriodStart ?? ""}
                        onChange={(e) =>
                            onArticleChange({ subjectPeriodStart: e.target.value || null })
                        }
                        className="h-8 text-xs"
                    />
                    <Input
                        type="date"
                        value={article.subjectPeriodEnd ?? ""}
                        onChange={(e) =>
                            onArticleChange({ subjectPeriodEnd: e.target.value || null })
                        }
                        className="h-8 text-xs"
                    />
                </div>
            </div>
        </div>
    );
}
