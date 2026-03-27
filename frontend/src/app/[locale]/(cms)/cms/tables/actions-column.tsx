"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, SquarePen } from "lucide-react";
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
    icon: React.ComponentType<{ className?: string }>;
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

function ActionsCell<TData extends Record<string, unknown>>({
    entity,
    label,
    copyKey,
    onEdit,
    promotedActions,
}: ActionsCellProps<TData>) {
    const t = useTranslations("Cms.ActionsColumn");
    const copyValue = String(entity[copyKey] ?? "");

    return (
        <div className="flex items-center gap-1">
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(entity)}>
                <span className="sr-only">{t("edit", { label })}</span>
                <SquarePen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled>
                <span className="sr-only">{t("view", { label })}</span>
                <Eye className="h-4 w-4" />
            </Button>
            {promotedActions?.map((action, i) => (
                <Button
                    key={i}
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => action.onClick(entity)}
                >
                    <span className="sr-only">{action.label}</span>
                    <action.icon className="h-4 w-4" />
                </Button>
            ))}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{t("openMenu")}</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                    <DropdownMenuItem
                        disabled={copyValue === ""}
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(copyValue);
                                toast.success(t("copied", { key: String(copyKey) }));
                            } catch {
                                toast.error(t("copyFailed"));
                            }
                        }}
                    >
                        {t("copy", { key: String(copyKey) })}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(entity)}>
                        {t("edit", { label })}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

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
