"use client";

import { useTranslations } from "next-intl";
import { X, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionVariant, type BulkAction } from "@/types/cms/actions";

export interface EntitySelectionGroup {
    countKey: string;
    count: number;
    inlineActions: BulkAction[];
    overflowActions?: BulkAction[];
}

interface SelectionToolbarProps {
    groups: EntitySelectionGroup[];
    onClear: () => void;
}

export function SelectionToolbar({ groups, onClear }: SelectionToolbarProps) {
    const t = useTranslations("Cms.SelectionToolbar");

    const activeGroups = groups.filter((g) => g.count > 0);

    // Always render so the toolbar area reserves space and the table never shifts.
    return (
        <div className="flex min-h-8 flex-wrap items-center gap-2">
            {activeGroups.map((group, i) => {
                const overflow = group.overflowActions ?? [];
                return (
                    <div key={group.countKey} className="contents">
                        {i > 0 && <div className="bg-border h-5 w-px shrink-0" />}
                        <span className="text-muted-foreground text-sm">
                            {t(group.countKey, { count: group.count })}
                        </span>
                        {group.inlineActions.map((action) => (
                            <Button
                                key={action.key}
                                variant={
                                    action.variant === ActionVariant.Destructive
                                        ? "destructive"
                                        : "outline"
                                }
                                size="sm"
                                onClick={action.onClick}
                            >
                                {action.icon}
                                {action.label}
                            </Button>
                        ))}
                        {overflow.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        aria-label={t("moreActions")}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {overflow.map((action) => (
                                        <DropdownMenuItem
                                            key={action.key}
                                            onClick={action.onClick}
                                            className={
                                                action.variant === ActionVariant.Destructive
                                                    ? "text-destructive"
                                                    : undefined
                                            }
                                        >
                                            {action.icon}
                                            {action.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                );
            })}
            <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
                <X className="h-4 w-4" />
                {t("clearSelection")}
            </Button>
        </div>
    );
}
