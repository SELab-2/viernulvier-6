"use client";

import { Fragment, memo, useMemo, type ReactNode } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";

function isSimpleAction<T>(action: Action<T>): action is Extract<Action<T>, { onClick: unknown }> {
    return "onClick" in action;
}

interface ActionsColumnOptions<TData> {
    actions: Action<TData>[];
}

interface ActionsCellProps<TData> {
    entity: TData;
    actions: Action<TData>[];
}

function ActionsCellInner<TData extends Record<string, unknown>>({
    entity,
    actions,
}: ActionsCellProps<TData>) {
    const t = useTranslations("Cms.ActionsColumn");
    const [open, setOpen] = useState(false);
    const closeMenu = () => setOpen(false);

    const { inlineActions, menuActions } = useMemo(() => {
        const inline: Extract<Action<TData>, { onClick: unknown }>[] = [];
        const menu: Action<TData>[] = [];

        for (const action of actions) {
            if (isSimpleAction(action) && action.display === ActionDisplay.Inline) {
                inline.push(action);
            } else {
                menu.push(action);
            }
        }

        return { inlineActions: inline, menuActions: menu };
    }, [actions]);

    return (
        <div className="flex items-center gap-1">
            {inlineActions.map((action) => (
                <Button
                    key={action.key}
                    variant="ghost"
                    className="h-8 w-8 cursor-pointer p-0"
                    onClick={() => action.onClick(entity)}
                >
                    <span className="sr-only">{action.label}</span>
                    {action.icon && <action.icon className="h-4 w-4" />}
                </Button>
            ))}
            {menuActions.length > 0 && (
                <DropdownMenu open={open} onOpenChange={setOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 cursor-pointer p-0">
                            <span className="sr-only">{t("openMenu")}</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                        {menuActions.map((action) =>
                            isSimpleAction(action) ? (
                                <DropdownMenuItem
                                    key={action.key}
                                    onClick={() => action.onClick(entity)}
                                    className={
                                        action.variant === ActionVariant.Destructive
                                            ? "text-destructive"
                                            : undefined
                                    }
                                >
                                    {action.icon && <action.icon className="h-4 w-4" />}
                                    {action.label}
                                </DropdownMenuItem>
                            ) : (
                                <Fragment key={action.key}>
                                    {action.render(entity, closeMenu)}
                                </Fragment>
                            )
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

const ActionsCell = memo(ActionsCellInner) as <TData extends Record<string, unknown>>(
    props: ActionsCellProps<TData>
) => ReactNode;

export function makeActionsColumn<TData extends Record<string, unknown>>(
    options: ActionsColumnOptions<TData>
): ColumnDef<TData> {
    const { actions } = options;

    return {
        id: "actions",
        cell: ({ row }) => <ActionsCell entity={row.original} actions={actions} />,
    };
}
