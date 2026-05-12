"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Save, Link2, ExternalLink, Crown } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { LanguageSelector } from "@/components/cms/language-selector";
import { useGetMediaEntityLinks } from "@/hooks/api/useMedia";
import { Media } from "@/types/models/media.types";
import { TagPickerSection } from "@/components/cms/tag-picker-section";

type Lang = "nl" | "en" | "fr";

interface MediaEditSheetProps {
    media: Media | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (media: Media) => void;
    isSaving?: boolean;
    tagSlugs: string[];
    inheritedTagSlugs: string[];
    onTagsChange: (slugs: string[]) => void;
}

function entityEditPath(entityType: string, entityId: string): string | null {
    switch (entityType) {
        case "production":
            return `/cms/productions/${entityId}/edit`;
        case "article":
            return `/cms/articles/${entityId}/edit`;
        case "collection":
            return `/cms/main/collections/${entityId}`;
        default:
            return null;
    }
}

export function MediaEditSheet({
    media,
    open,
    onOpenChange,
    onSave,
    isSaving,
    tagSlugs,
    inheritedTagSlugs,
    onTagsChange,
}: MediaEditSheetProps) {
    const t = useTranslations("Cms.Ingest");
    const tMedia = useTranslations("Cms.ProductionMedia");
    const locale = useLocale();
    const [form, setForm] = useState<Partial<Media>>({});
    const [activeLang, setActiveLang] = useState<Lang>("nl");

    const { data: entityLinks } = useGetMediaEntityLinks(media?.id ?? null);

    useEffect(() => {
        if (media) {
            const id = setTimeout(() => setForm({ ...media }), 0);
            return () => clearTimeout(id);
        }
    }, [media]);

    if (!media) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...media, ...form } as Media);
    };

    const updateField = (field: keyof Media, value: string | null) => {
        setForm((prev) => ({ ...prev, [field]: value === "" ? null : value }));
    };

    const altKey = `altText${capitalize(activeLang)}` as keyof Media;
    const creditKey = `credit${capitalize(activeLang)}` as keyof Media;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="border-foreground/20 flex flex-col gap-0 overflow-y-auto border-l p-0 sm:max-w-lg">
                <SheetHeader className="border-foreground/10 border-b px-6 pt-6 pb-4">
                    <SheetTitle className="font-display text-xl font-bold tracking-tight">
                        {t("editMedia")}
                    </SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-6 py-6">
                    {media.url && (
                        <div
                            className="relative mx-auto w-full max-w-xs overflow-hidden"
                            style={{
                                aspectRatio:
                                    media.width && media.height && media.height > 0
                                        ? media.width / media.height
                                        : 16 / 9,
                            }}
                        >
                            <Image
                                src={media.url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 50vw, 320px"
                            />
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="border-foreground/10 flex items-center justify-between border-b pb-2">
                            <h3 className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                {tMedia("editMetadata")}
                            </h3>
                            <LanguageSelector
                                activeLang={activeLang}
                                onChange={setActiveLang}
                                languages={["nl", "en", "fr"]}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{tMedia("altText")}</Label>
                                <Input
                                    value={(form[altKey] as string | null) ?? ""}
                                    onChange={(e) => updateField(altKey, e.target.value)}
                                    placeholder={activeLang.toUpperCase()}
                                    className="h-7 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">{tMedia("credit")}</Label>
                                <Input
                                    value={(form[creditKey] as string | null) ?? ""}
                                    onChange={(e) => updateField(creditKey, e.target.value)}
                                    placeholder={activeLang.toUpperCase()}
                                    className="h-7 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Entity links */}
                    <div className="space-y-3">
                        <div className="border-foreground/10 flex items-center gap-1.5 border-b pb-2">
                            <Link2 className="text-muted-foreground h-3.5 w-3.5" />
                            <h3 className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                {t("entityLinks")}
                            </h3>
                        </div>
                        {entityLinks && entityLinks.length > 0 ? (
                            <div className="space-y-1.5">
                                {entityLinks.map((link) => {
                                    const path = entityEditPath(link.entity_type, link.entity_id);
                                    const displayTitle =
                                        (locale === "en" ? link.title?.en : link.title?.nl) ||
                                        link.title?.en ||
                                        link.title?.nl ||
                                        link.entity_type;
                                    const isGallery = link.role === "gallery";
                                    const content = (
                                        <div className="hover:bg-foreground/[0.02] group flex items-center justify-between border px-2 py-1.5 transition-colors">
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <span className="bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase">
                                                    {link.entity_type}
                                                </span>
                                                <span className="truncate text-xs">
                                                    {displayTitle}
                                                </span>
                                                {link.is_cover_image && (
                                                    <Crown className="text-foreground h-3 w-3 shrink-0" />
                                                )}
                                                {!isGallery && (
                                                    <span className="text-muted-foreground shrink-0 text-[10px]">
                                                        {link.role}
                                                    </span>
                                                )}
                                            </div>
                                            {path && (
                                                <span className="text-muted-foreground group-hover:text-foreground ml-2 flex h-5 w-5 shrink-0 items-center justify-center transition-colors">
                                                    <ExternalLink className="h-3 w-3" />
                                                </span>
                                            )}
                                        </div>
                                    );
                                    return path ? (
                                        <Link
                                            key={`${link.entity_type}-${link.entity_id}`}
                                            href={path as never}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {content}
                                        </Link>
                                    ) : (
                                        <div key={`${link.entity_type}-${link.entity_id}`}>
                                            {content}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-muted-foreground font-mono text-[10px] tracking-wider">
                                {t("noEntityLinks")}
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="border-foreground/10 border-b pb-2">
                            <h3 className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                Tags
                            </h3>
                        </div>
                        <TagPickerSection
                            entityType="media"
                            selectedSlugs={tagSlugs}
                            inheritedSlugs={inheritedTagSlugs}
                            onChange={onTagsChange}
                            compact
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            {tMedia("cancel")}
                        </Button>
                        <Button type="submit" size="sm" disabled={isSaving}>
                            {isSaving ? (
                                <Spinner className="mr-1.5 size-3" />
                            ) : (
                                <Save className="mr-1.5 size-3.5" />
                            )}
                            {tMedia("save")}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
