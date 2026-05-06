"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Trash2, Plus, ExternalLink } from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/routing";

import {
    useUpdateSeries,
    useAddProductionsToSeries,
    useRemoveProductionFromSeries,
} from "@/hooks/api/useSeries";
import { useGetProductionsByIds } from "@/hooks/api/useProductions";
import { SeriesCoverField } from "@/components/cms/series-cover-field";
import { ProductionPickerDialog } from "@/components/cms/production-picker-dialog";
import { LanguageSelector } from "@/components/cms/language-selector";
import { getLocalizedField } from "@/lib/locale";
import type { Series, SeriesTranslation } from "@/types/models/series.types";
import type { Production } from "@/types/models/production.types";

interface SeriesEditorSheetProps {
    series: Series;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SeriesEditorSheet({ series, open, onOpenChange }: SeriesEditorSheetProps) {
    const t = useTranslations("Cms.Series");
    const tCommon = useTranslations("Cms.common");
    const locale = useLocale();

    const [activeLang, setActiveLang] = useState<"nl" | "en">(locale as "nl" | "en");

    // Manage all translations in local state to avoid cascading renders
    const [localTranslations, setLocalTranslations] = useState<SeriesTranslation[]>(
        series.translations
    );
    const [slug, setSlug] = useState(series.slug);
    const [isProductionPickerOpen, setIsProductionPickerOpen] = useState(false);

    const updateSeries = useUpdateSeries();
    const addProductions = useAddProductionsToSeries(series.slug);
    const removeProduction = useRemoveProductionFromSeries(series.slug);

    const productionQueries = useGetProductionsByIds(series.productionIds);
    const productions = productionQueries.map((q) => q.data).filter((p): p is Production => !!p);

    const currentTranslation =
        localTranslations.find((t) => t.languageCode === activeLang) || localTranslations[0];

    const handleTranslationChange = (field: keyof SeriesTranslation, value: string) => {
        setLocalTranslations((prev) =>
            prev.map((t) => {
                if (t.languageCode === activeLang) {
                    return { ...t, [field]: value };
                }
                return t;
            })
        );
    };

    const handleSaveMetadata = () => {
        updateSeries.mutate(
            { ...series, slug, translations: localTranslations },
            {
                onSuccess: () => toast.success(t("saveSuccess")),
                onError: () => toast.error(t("saveError")),
            }
        );
    };

    const handleAddProductions = (newProductions: Production[]) => {
        addProductions.mutate(
            newProductions.map((p) => p.id),
            {
                onSuccess: () => toast.success("Producties toegevoegd"),
            }
        );
    };

    const handleRemoveProduction = (productionId: string) => {
        removeProduction.mutate(productionId, {
            onSuccess: () => toast.success("Productie verwijderd"),
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-[400px] flex-col p-0 sm:w-[540px]">
                <SheetHeader className="border-b p-6">
                    <div className="flex items-center justify-between">
                        <SheetTitle>{t("eyebrow")}</SheetTitle>
                        <LanguageSelector activeLang={activeLang} onChange={setActiveLang} />
                    </div>
                    <SheetDescription>
                        Beheer de reeksgegevens en gekoppelde producties.
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="general" className="flex flex-1 flex-col overflow-hidden">
                    <div className="border-b px-6">
                        <TabsList className="flex h-12 w-full justify-start gap-6 rounded-none bg-transparent p-0">
                            <TabsTrigger
                                value="general"
                                className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-0 font-mono text-[10px] tracking-widest uppercase data-[state=active]:bg-transparent"
                            >
                                Algemeen
                            </TabsTrigger>
                            <TabsTrigger
                                value="productions"
                                className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-0 font-mono text-[10px] tracking-widest uppercase data-[state=active]:bg-transparent"
                            >
                                Producties ({series.productionIds.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="media"
                                className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-0 font-mono text-[10px] tracking-widest uppercase data-[state=active]:bg-transparent"
                            >
                                Media
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="space-y-6 p-6">
                            <TabsContent value="general" className="m-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">
                                            {t("fieldName")} ({activeLang.toUpperCase()})
                                        </Label>
                                        <Input
                                            id="name"
                                            value={currentTranslation.name}
                                            onChange={(e) =>
                                                handleTranslationChange("name", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subtitle">
                                            {t("fieldSubtitle")} ({activeLang.toUpperCase()})
                                        </Label>
                                        <Input
                                            id="subtitle"
                                            value={currentTranslation.subtitle}
                                            onChange={(e) =>
                                                handleTranslationChange("subtitle", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="slug">Slug</Label>
                                        <Input
                                            id="slug"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">
                                            {t("fieldDescription")} ({activeLang.toUpperCase()})
                                        </Label>
                                        <Textarea
                                            id="description"
                                            value={currentTranslation.description}
                                            onChange={(e) =>
                                                handleTranslationChange(
                                                    "description",
                                                    e.target.value
                                                )
                                            }
                                            rows={8}
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSaveMetadata}
                                    disabled={updateSeries.isPending}
                                >
                                    {updateSeries.isPending ? tCommon("saving") : tCommon("save")}
                                </Button>
                            </TabsContent>

                            <TabsContent value="productions" className="m-0 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium">Gekoppelde producties</h3>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsProductionPickerOpen(true)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Toevoegen
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {productions.length === 0 ? (
                                        <p className="text-muted-foreground text-sm italic">
                                            Geen producties gekoppeld.
                                        </p>
                                    ) : (
                                        productions.map((p: Production) => {
                                            const title =
                                                getLocalizedField(p, "title", locale) || p.slug;
                                            return (
                                                <div
                                                    key={p.id}
                                                    className="group hover:bg-muted/50 flex items-center gap-3 border p-2"
                                                >
                                                    <div className="bg-muted relative h-10 w-14 shrink-0">
                                                        {p.coverImageUrl ? (
                                                            <Image
                                                                src={p.coverImageUrl}
                                                                alt={title}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium">
                                                            {title}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <Button
                                                            asChild
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                        >
                                                            <Link
                                                                href={`/productions/${p.id}`}
                                                                target="_blank"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                                                            onClick={() =>
                                                                handleRemoveProduction(p.id)
                                                            }
                                                            disabled={removeProduction.isPending}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="media" className="m-0 space-y-6">
                                <SeriesCoverField series={series} />
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>

                <SheetFooter className="border-t p-6">
                    <Button variant="ghost" className="mr-auto" asChild>
                        <Link href={`/series/${series.slug}`} target="_blank" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Bekijk op site
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Sluiten
                    </Button>
                </SheetFooter>

                <ProductionPickerDialog
                    open={isProductionPickerOpen}
                    onOpenChange={setIsProductionPickerOpen}
                    onSelect={handleAddProductions}
                    excludeIds={series.productionIds}
                />
            </SheetContent>
        </Sheet>
    );
}
