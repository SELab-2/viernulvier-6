"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Search, Plus } from "lucide-react";
import { useGetProductions } from "@/hooks/api/useProductions";
import { getLocalizedField } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { Production } from "@/types/models/production.types";

interface ProductionPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (productions: Production[]) => void;
    excludeIds?: string[];
}

export function ProductionPickerDialog({
    open,
    onOpenChange,
    onSelect,
    excludeIds = [],
}: ProductionPickerDialogProps) {
    const t = useTranslations("Cms.Productions");
    const locale = useLocale();
    const [query, setQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const { data: productionsResult, isLoading } = useGetProductions({
        params: { q: query || undefined, limit: 100 },
    });

    const productions = useMemo(() => {
        if (!productionsResult?.data) return [];
        return productionsResult.data.filter((p) => !excludeIds.includes(p.id));
    }, [productionsResult, excludeIds]);

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleConfirm = () => {
        const selected = productions.filter((p) => selectedIds.has(p.id));
        onSelect(selected);
        onOpenChange(false);
        setSelectedIds(new Set());
        setQuery("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t("search")}</DialogTitle>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("search")}
                        className="pl-9"
                    />
                </div>

                <div className="h-[400px] overflow-y-auto pr-4">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Spinner />
                        </div>
                    ) : productions.length === 0 ? (
                        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                            Geen producties gevonden.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {productions.map((p) => {
                                const title = getLocalizedField(p, "title", locale) || p.slug;
                                const artist = getLocalizedField(p, "artist", locale);
                                return (
                                    <div
                                        key={p.id}
                                        className="hover:bg-muted/50 flex cursor-pointer items-center gap-4 border p-2 transition-colors"
                                        onClick={() => toggleSelection(p.id)}
                                    >
                                        <Checkbox
                                            checked={selectedIds.has(p.id)}
                                            onCheckedChange={() => toggleSelection(p.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="bg-muted relative h-12 w-16 shrink-0">
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
                                            {artist && (
                                                <div className="text-muted-foreground truncate text-xs italic">
                                                    {artist}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end gap-3 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuleren
                    </Button>
                    <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                        <Plus className="mr-2 h-4 w-4" />
                        Toevoegen ({selectedIds.size})
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
