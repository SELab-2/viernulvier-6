"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X, MoreHorizontal } from "lucide-react";
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
        <div className="flex min-h-8 flex-wrap items-center gap-3">
            {activeGroups.map((group, i) => (
                <div key={group.countKey} className="contents">
                    {i > 0 && <div className="bg-foreground/20 h-4 w-px shrink-0" />}
                    <span className="text-muted-foreground font-mono text-[10px] tracking-[1px] uppercase">
                        {t(group.countKey, { count: group.count })}
                    </span>
                    {group.inlineActions.map((action) => (
                        <button
                            key={action.label}
                            onClick={action.onClick}
                            type="button"
                            className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[10px] tracking-[0.5px] uppercase transition-colors ${
                                action.variant === "destructive"
                                    ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                                    : "border-foreground/20 hover:bg-foreground/5"
                            }`}
                        >
                            {action.icon && <span className="h-3.5 w-3.5">{action.icon}</span>}
                            {action.label}
                        </button>
                    ))}
                    {group.overflowActions.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={t("moreActions")}
                                    className="border-foreground/20 hover:bg-foreground/5 inline-flex h-7 w-7 items-center justify-center rounded-sm border transition-colors"
                                >
                                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="border-foreground/20 min-w-[140px]"
                            >
                                {group.overflowActions.map((action) => (
                                    <DropdownMenuItem
                                        key={action.label}
                                        onClick={action.onClick}
                                        className={`font-body text-sm ${
                                            action.variant === "destructive"
                                                ? "text-destructive"
                                                : ""
                                        }`}
                                    >
                                        {action.icon && <span className="mr-2">{action.icon}</span>}
                                        {action.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            ))}
            {activeGroups.length > 0 && (
                <button
                    type="button"
                    onClick={onClear}
                    className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[1px] uppercase transition-colors"
                >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {t("clearSelection")}
                </button>
            )}
        </div>
    );
}
