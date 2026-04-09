"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionVariant, type BulkAction } from "@/types/cms/actions";

export interface EntityCount {
    countKey: string;
    count: number;
}

interface ActionBarProps {
    totalCount: number;
    totalCountKey: string;
    entityCounts: EntityCount[];
    actions: BulkAction[];
    onClear: () => void;
}

export function ActionBar({
    totalCount,
    totalCountKey,
    entityCounts,
    actions,
    onClear,
}: ActionBarProps) {
    const t = useTranslations("Cms.ActionBar");

    const activeCounts = entityCounts.filter((e) => e.count > 0);
    const hasSelection = activeCounts.length > 0;

    return (
        <div className="flex h-10 shrink-0 items-center gap-2">
            {hasSelection ? (
                <>
                    {activeCounts.map((entity, i) => (
                        <div key={entity.countKey} className="contents">
                            {i > 0 && <div className="bg-border h-5 w-px shrink-0" />}
                            <span className="text-muted-foreground text-sm">
                                {t(entity.countKey, { count: entity.count })}
                            </span>
                        </div>
                    ))}
                    {actions.map((action) => (
                        <Button
                            key={action.key}
                            variant={
                                action.variant === ActionVariant.Destructive
                                    ? "destructive"
                                    : "outline"
                            }
                            size="sm"
                            onClick={action.onClick}
                            disabled={action.disabled || !action.onClick}
                        >
                            {action.icon}
                            {action.label}
                        </Button>
                    ))}
                    <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
                        <X className="h-4 w-4" />
                        {t("clearSelection")}
                    </Button>
                </>
            ) : (
                <span className="text-muted-foreground text-sm">
                    {t(totalCountKey, { count: totalCount })}
                </span>
            )}
        </div>
    );
}
