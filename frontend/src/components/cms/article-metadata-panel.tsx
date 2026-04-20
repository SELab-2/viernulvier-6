"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { XIcon } from "lucide-react";

import { HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLinkMedia, useGetEntityMedia, useUnlinkMedia, useUploadMedia } from "@/hooks/api";
import type { Media } from "@/types/models/media.types";
import { Article, ArticleStatus } from "@/types/models/article.types";
import { statusStyles } from "@/components/cms/status-badge";
import { cn } from "@/lib/utils";
import { MediaPickerDialog } from "./media-picker-dialog";

interface ArticleMetadataPanelProps {
    article: Article;
    onArticleChange: (patch: Partial<Article>) => void;
}

export function ArticleMetadataPanel({ article, onArticleChange }: ArticleMetadataPanelProps) {
    const t = useTranslations("Cms.Articles");

    const [pickerOpen, setPickerOpen] = useState(false);
    const { data: coverMedia = [] } = useGetEntityMedia("article", article.id, {
        params: { role: "cover" },
    });
    const linkMedia = useLinkMedia();
    const unlinkMedia = useUnlinkMedia();
    const uploadMedia = useUploadMedia();
    const cover = coverMedia[0] ?? null;

    const handlePickerSelect = useCallback(
        async (media: Media) => {
            try {
                await linkMedia.mutateAsync({
                    entityType: "article",
                    entityId: article.id,
                    input: {
                        mediaId: media.id,
                        role: "cover",
                        isCoverImage: true,
                    },
                });
                toast.success(t("coverSetSuccess"));
            } catch {
                toast.error(t("coverSetError"));
            }
            setPickerOpen(false);
        },
        [linkMedia, article.id, t]
    );

    const handleRemoveCover = useCallback(async () => {
        if (!cover) return;
        try {
            await unlinkMedia.mutateAsync({
                entityType: "article",
                entityId: article.id,
                mediaId: cover.id,
            });
            toast.success(t("coverRemovedSuccess"));
        } catch {
            toast.error(t("coverRemovedError"));
        }
    }, [unlinkMedia, article.id, cover, t]);

    const handleUploadCover = useCallback(
        async (file: File) => {
            try {
                await uploadMedia.mutateAsync({
                    file,
                    entityType: "article",
                    entityId: article.id,
                    metadata: { role: "cover", isCoverImage: true },
                });
                toast.success(t("coverSetSuccess"));
            } catch {
                toast.error(t("coverSetError"));
            }
        },
        [uploadMedia, article.id, t]
    );

    return (
        <>
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
                            <SelectItem value="draft">{t("statusDraft")}</SelectItem>
                            <SelectItem value="published">{t("statusPublished")}</SelectItem>
                            <SelectItem value="archived">{t("statusArchived")}</SelectItem>
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
                    <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-medium">{t("subjectPeriod")}</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HelpCircle className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-56">
                                    {t("subjectPeriodHelp")}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
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
                    <p className="text-muted-foreground text-xs">{t("subjectPeriodCaption")}</p>
                </div>

                {/* Cover image */}
                <div className="space-y-1">
                    <Label className="text-xs font-medium">{t("coverImage")}</Label>
                    {cover ? (
                        <div className="overflow-hidden rounded border">
                            {cover.url && (
                                <div className="relative aspect-video">
                                    <Image
                                        src={cover.url}
                                        alt={cover.altTextNl ?? cover.altTextEn ?? ""}
                                        fill
                                        className="object-cover"
                                        sizes="256px"
                                    />
                                </div>
                            )}
                            <div className="flex items-center justify-between border-t px-2 py-1.5">
                                <span className="text-muted-foreground truncate text-[10px]">
                                    {cover.altTextNl ?? cover.mimeType}
                                </span>
                                <div className="flex shrink-0 gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => setPickerOpen(true)}
                                    >
                                        {t("coverChange")}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive h-6 px-2"
                                        onClick={handleRemoveCover}
                                        disabled={unlinkMedia.isPending}
                                        aria-label={t("coverRemove")}
                                    >
                                        <XIcon className="size-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border-foreground/10 flex flex-col gap-2 rounded border border-dashed p-3">
                            <p className="text-muted-foreground text-center text-xs">
                                {t("coverEmpty")}
                            </p>
                            <div className="flex gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 flex-1 text-xs"
                                    onClick={() => setPickerOpen(true)}
                                >
                                    {t("coverPick")}
                                </Button>
                                <label className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) void handleUploadCover(file);
                                            e.target.value = "";
                                        }}
                                        className="hidden"
                                        disabled={uploadMedia.isPending}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-full text-xs"
                                        asChild
                                        disabled={uploadMedia.isPending}
                                    >
                                        <span>
                                            {uploadMedia.isPending && (
                                                <Spinner className="mr-1 size-3" />
                                            )}
                                            {t("coverUpload")}
                                        </span>
                                    </Button>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {pickerOpen && (
                <MediaPickerDialog
                    entityType="article"
                    entityId={article.id}
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) setPickerOpen(false);
                    }}
                    onSelect={handlePickerSelect}
                />
            )}
        </>
    );
}
