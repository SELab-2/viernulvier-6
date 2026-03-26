"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BulkAction {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive";
}

export type SelectionToolbarCountKey =
    | "productionsSelected"
    | "eventsSelected"
    | "locationsSelected"
    | "hallsSelected";

export interface EntitySelectionGroup {
    countKey: SelectionToolbarCountKey;
    count: number;
    inlineActions: BulkAction[];
    overflowActions: BulkAction[];
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
            {activeGroups.map((group, i) => (
                <div key={group.countKey} className="contents">
                    {i > 0 && <div className="bg-border h-5 w-px shrink-0" />}
                    <span className="text-muted-foreground text-sm">
                        {t(group.countKey, { count: group.count })}
                    </span>
                    {group.inlineActions.map((action) => (
                        <Button
                            key={action.label}
                            variant={action.variant === "destructive" ? "destructive" : "outline"}
                            size="sm"
                            onClick={action.onClick}
                        >
                            {action.icon}
                            {action.label}
                        </Button>
                    ))}
                    {group.overflowActions.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {group.overflowActions.map((action) => (
                                    <DropdownMenuItem
                                        key={action.label}
                                        onClick={action.onClick}
                                        className={
                                            action.variant === "destructive"
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
            ))}
            <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
                <X className="h-4 w-4" />
                {t("clearSelection")}
            </Button>
        </div>
    );
}
