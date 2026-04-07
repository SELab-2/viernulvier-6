"use client";

import { memo, useCallback, useMemo, type ComponentType, type ReactNode } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, SquarePen } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CopyableKeys<TData> = {
    [K in keyof TData]: TData[K] extends string | number | null | undefined ? K : never;
}[keyof TData];

export interface PromotedAction<TData> {
    key: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
    onClick: (entity: TData) => void;
}

interface ActionsColumnOptions<TData> {
    label: string;
    copyKey: CopyableKeys<TData>;
    onEdit: (entity: TData) => void;
    promotedActions?: PromotedAction<TData>[];
    extraMenuItems?: (entity: TData, closeMenu: () => void) => ReactNode;
}

interface ActionsCellProps<TData> {
    entity: TData;
    label: string;
    copyKey: CopyableKeys<TData>;
    onEdit: (entity: TData) => void;
    promotedActions?: PromotedAction<TData>[];
    extraMenuItems?: (entity: TData, closeMenu: () => void) => ReactNode;
}

function ActionsCellInner<TData extends Record<string, unknown>>({
    entity,
    label,
    copyKey,
    onEdit,
    promotedActions,
    extraMenuItems,
}: ActionsCellProps<TData>) {
    const t = useTranslations("Cms.ActionsColumn");
    const copyValue = String(entity[copyKey] ?? "");
    const [open, setOpen] = useState(false);

    const handleEdit = useCallback(() => onEdit(entity), [onEdit, entity]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(copyValue);
            toast.success(t("copied", { key: String(copyKey) }));
        } catch {
            toast.error(t("copyFailed"));
        }
    }, [copyValue, copyKey, t]);

    const boundPromotedActions = useMemo(
        () =>
            promotedActions?.map((action) => ({
                ...action,
                onClick: () => action.onClick(entity),
            })),
        [promotedActions, entity]
    );

    return (
        <div className="flex items-center gap-1">
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleEdit}>
                <span className="sr-only">{t("edit", { label })}</span>
                <SquarePen className="h-4 w-4" />
            </Button>
            {boundPromotedActions?.map((action) => (
                <Button
                    key={action.key}
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={action.onClick}
                >
                    <span className="sr-only">{action.label}</span>
                    <action.icon className="h-4 w-4" />
                </Button>
            ))}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{t("openMenu")}</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                    <DropdownMenuItem disabled={copyValue === ""} onClick={handleCopy}>
                        {t("copy", { key: String(copyKey) })}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEdit}>{t("edit", { label })}</DropdownMenuItem>
                    {extraMenuItems?.(entity, () => setOpen(false))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

const ActionsCell = memo(ActionsCellInner) as <TData extends Record<string, unknown>>(
    props: ActionsCellProps<TData>
) => ReactNode;

export function makeActionsColumn<TData extends Record<string, unknown>>(
    options: ActionsColumnOptions<TData>
): ColumnDef<TData> {
    const { label, copyKey, onEdit, promotedActions, extraMenuItems } = options;

    return {
        id: "actions",
        cell: ({ row }) => (
            <ActionsCell
                entity={row.original}
                label={label}
                copyKey={copyKey}
                onEdit={onEdit}
                promotedActions={promotedActions}
                extraMenuItems={extraMenuItems}
            />
        ),
    };
}
