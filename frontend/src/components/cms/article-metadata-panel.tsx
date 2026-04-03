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
import { useGetArtists } from "@/hooks/api/useArtists";
import { useGetProductions } from "@/hooks/api/useProductions";
import { useGetLocations } from "@/hooks/api/useLocations";
import { useGetEvents } from "@/hooks/api/useEvents";
import { Article, ArticleRelations, ArticleStatus } from "@/types/models/article.types";
import { statusStyles } from "@/components/cms/status-badge";
import { cn } from "@/lib/utils";

interface RelationMultiSelectProps {
    label: string;
    ids: string[];
    options: { id: string; label: string }[];
    onChange: (ids: string[]) => void;
}

function RelationMultiSelect({ label, ids, options, onChange }: RelationMultiSelectProps) {
    const toggle = (id: string) => {
        onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    };

    return (
        <div className="space-y-1">
            <Label className="text-xs font-medium">{label}</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {options.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No options available</p>
                ) : (
                    options.map((opt) => (
                        <label
                            key={opt.id}
                            className="flex cursor-pointer items-center gap-2 text-xs"
                        >
                            <input
                                type="checkbox"
                                checked={ids.includes(opt.id)}
                                onChange={() => toggle(opt.id)}
                                className="h-3 w-3"
                            />
                            <span className="truncate">{opt.label}</span>
                        </label>
                    ))
                )}
            </div>
        </div>
    );
}

interface ArticleMetadataPanelProps {
    article: Article;
    relations: ArticleRelations;
    onArticleChange: (patch: Partial<Article>) => void;
    onRelationsChange: (relations: ArticleRelations) => void;
}

export function ArticleMetadataPanel({
    article,
    relations,
    onArticleChange,
    onRelationsChange,
}: ArticleMetadataPanelProps) {
    const t = useTranslations("Cms.Articles");
    const { data: productions = [] } = useGetProductions();
    const { data: artists = [] } = useGetArtists();
    const { data: locations = [] } = useGetLocations();
    const { data: events = [] } = useGetEvents();

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

            {/* Related productions */}
            <RelationMultiSelect
                label={t("relatedProductions")}
                ids={relations.productionIds}
                options={productions.map((p) => ({
                    id: p.id,
                    label: p.translations.find((t) => t.languageCode === "nl")?.title ?? p.slug,
                }))}
                onChange={(productionIds) => onRelationsChange({ ...relations, productionIds })}
            />

            {/* Related artists */}
            <RelationMultiSelect
                label={t("relatedArtists")}
                ids={relations.artistIds}
                options={artists.map((a) => ({
                    id: a.id,
                    label: a.name,
                }))}
                onChange={(artistIds) => onRelationsChange({ ...relations, artistIds })}
            />

            {/* Related locations */}
            <RelationMultiSelect
                label={t("relatedLocations")}
                ids={relations.locationIds}
                options={locations.map((l) => ({
                    id: l.id,
                    label: l.name ?? l.id,
                }))}
                onChange={(locationIds) => onRelationsChange({ ...relations, locationIds })}
            />

            {/* Related events */}
            <RelationMultiSelect
                label={t("relatedEvents")}
                ids={relations.eventIds}
                options={events.map((e) => ({
                    id: e.id,
                    label: e.startsAt ?? "Untitled event",
                }))}
                onChange={(eventIds) => onRelationsChange({ ...relations, eventIds })}
            />
        </div>
    );
}
