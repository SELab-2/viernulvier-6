"use client";

import { memo, useCallback, useMemo, type ComponentType, type ReactNode } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, SquarePen, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
}

interface ActionsCellProps<TData> {
    entity: TData;
    label: string;
    copyKey: CopyableKeys<TData>;
    onEdit: (entity: TData) => void;
    promotedActions?: PromotedAction<TData>[];
}

function ActionsCellInner<TData extends Record<string, unknown>>({
    entity,
    label,
    copyKey,
    onEdit,
    promotedActions,
}: ActionsCellProps<TData>) {
    const t = useTranslations("Cms.ActionsColumn");
    const copyValue = String(entity[copyKey] ?? "");

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
            <button
                type="button"
                onClick={handleEdit}
                className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
            >
                <span className="sr-only">{t("edit", { label })}</span>
                <SquarePen className="h-4 w-4" strokeWidth={1.5} />
            </button>
            {boundPromotedActions?.map((action) => (
                <button
                    key={action.key}
                    type="button"
                    onClick={action.onClick}
                    className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
                >
                    <span className="sr-only">{action.label}</span>
                    <action.icon className="h-4 w-4" />
                </button>
            ))}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
                    >
                        <span className="sr-only">{t("openMenu")}</span>
                        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-foreground/20 min-w-[160px]">
                    <DropdownMenuLabel className="text-muted-foreground font-mono text-[10px] tracking-[1px] uppercase">
                        {t("actions")}
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                        disabled={copyValue === ""}
                        onClick={handleCopy}
                        className="font-body text-sm"
                    >
                        <Copy className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                        {t("copy", { key: String(copyKey) })}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEdit} className="font-body text-sm">
                        <SquarePen className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                        {t("edit", { label })}
                    </DropdownMenuItem>
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
    const { label, copyKey, onEdit, promotedActions } = options;

    return {
        id: "actions",
        cell: ({ row }) => (
            <ActionsCell
                entity={row.original}
                label={label}
                copyKey={copyKey}
                onEdit={onEdit}
                promotedActions={promotedActions}
            />
        ),
    };
}
