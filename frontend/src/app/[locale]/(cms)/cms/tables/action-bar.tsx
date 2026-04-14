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
    entityCounts: EntityCount[];
    actions: BulkAction[];
    onClear: () => void;
}

export function ActionBar({ entityCounts, actions, onClear }: ActionBarProps) {
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
                            <span className="text-muted-foreground font-mono text-[10px] tracking-[1.5px] uppercase">
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
                            className="cursor-pointer rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                        >
                            {action.icon && (
                                <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{action.icon}</span>
                            )}
                            {action.label}
                        </Button>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="text-muted-foreground hover:text-foreground ml-auto cursor-pointer rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        <X className="h-3.5 w-3.5" />
                        {t("clearSelection")}
                    </Button>
                </>
            ) : null}
        </div>
    );
}
