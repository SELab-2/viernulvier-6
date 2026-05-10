"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Check, X, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Facet } from "@/types/models/taxonomy.types";
import { cn } from "@/lib/utils";

interface FacetComboboxProps {
    facet: Facet;
    selectedSlugs: string[];
    inheritedSlugs: string[];
    onChange: (slugs: string[]) => void;
    onCreateTag: (query: string) => void;
    compact?: boolean;
}

export function FacetCombobox({
    facet,
    selectedSlugs,
    inheritedSlugs,
    onChange,
    onCreateTag,
    compact = false,
}: FacetComboboxProps) {
    const locale = useLocale();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const getLabel = (translations: { languageCode: string; label: string }[]) =>
        translations.find((t) => t.languageCode === locale)?.label ?? translations[0]?.label ?? "";

    const toggle = (slug: string) => {
        if (inheritedSlugs.includes(slug)) return;
        if (selectedSlugs.includes(slug)) {
            onChange(selectedSlugs.filter((s) => s !== slug));
        } else {
            onChange([...selectedSlugs, slug]);
        }
    };

    const filtered = facet.tags.filter((tag) =>
        getLabel(tag.translations).toLowerCase().includes(search.toLowerCase())
    );

    const allSelectedSlugs = [...new Set([...inheritedSlugs, ...selectedSlugs])];

    return (
        <div className="space-y-1.5">
            {allSelectedSlugs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {allSelectedSlugs.map((slug) => {
                        const tag = facet.tags.find((t) => t.slug === slug);
                        if (!tag) return null;
                        const isInherited = inheritedSlugs.includes(slug);
                        return (
                            <Badge
                                key={slug}
                                variant="secondary"
                                className={cn("gap-1", isInherited && "opacity-60")}
                            >
                                {getLabel(tag.translations)}
                                {!isInherited && (
                                    <button
                                        type="button"
                                        onClick={() => toggle(slug)}
                                        className="hover:text-destructive ml-0.5 rounded-full"
                                        aria-label={`Remove ${getLabel(tag.translations)}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </Badge>
                        );
                    })}
                </div>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "justify-start text-left font-normal",
                            compact ? "h-7 text-xs" : "h-8 text-sm"
                        )}
                    >
                        Add tag…
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search…"
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            <CommandGroup>
                                {filtered.map((tag) => {
                                    const label = getLabel(tag.translations);
                                    const isSelected = selectedSlugs.includes(tag.slug);
                                    const isInherited = inheritedSlugs.includes(tag.slug);
                                    return (
                                        <CommandItem
                                            key={tag.slug}
                                            value={label}
                                            disabled={isInherited}
                                            onSelect={() => {
                                                toggle(tag.slug);
                                                setSearch("");
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    isSelected || isInherited
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            {label}
                                            {isInherited && (
                                                <span className="text-muted-foreground ml-auto text-[10px]">
                                                    inherited
                                                </span>
                                            )}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                            {filtered.length === 0 && search.trim() !== "" && (
                                <CommandGroup forceMount>
                                    <CommandItem
                                        forceMount
                                        value={`__create__${search.trim()}`}
                                        onSelect={() => {
                                            onCreateTag(search.trim());
                                            setSearch("");
                                            setOpen(false);
                                        }}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create &ldquo;{search.trim()}&rdquo;
                                    </CommandItem>
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
