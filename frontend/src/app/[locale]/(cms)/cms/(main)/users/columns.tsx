"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Shield, User as UserIcon, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";
import type { User, UserRole } from "@/hooks/api/useUsers";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

function roleLabel(role: UserRole): string {
    switch (role) {
        case "admin":
            return "Admin";
        case "editor":
            return "Editor";
        case "user":
            return "User";
        default:
            return role;
    }
}

function roleBadgeClass(role: UserRole): string {
    switch (role) {
        case "admin":
            return "bg-foreground text-background";
        case "editor":
            return "bg-foreground/10 text-foreground";
        case "user":
            return "border border-foreground/20 text-muted-foreground";
        default:
            return "border border-foreground/20 text-muted-foreground";
    }
}

function RoleIcon({ role }: { role: UserRole }) {
    if (role === "admin") return <Shield className="h-3.5 w-3.5" />;
    if (role === "editor") return <PenLine className="h-3.5 w-3.5" />;
    return <UserIcon className="h-3.5 w-3.5" />;
}

function isSimpleAction<T>(action: Action<T>): action is Extract<Action<T>, { onClick: unknown }> {
    return "onClick" in action;
}

function ActionsCell({ entity, actions }: { entity: User; actions: Action<User>[] }) {
    const t = useTranslations("Cms.ActionsColumn");
    const [open, setOpen] = useState(false);
    const closeMenu = () => setOpen(false);

    const inlineActions = actions.filter(
        (a): a is Extract<Action<User>, { onClick: unknown }> =>
            isSimpleAction(a) && a.display === ActionDisplay.Inline
    );
    const menuActions = actions.filter(
        (a) => !(isSimpleAction(a) && a.display === ActionDisplay.Inline)
    );

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
                                    variant={
                                        action.variant === ActionVariant.Destructive
                                            ? "destructive"
                                            : "default"
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

export function makeUserColumns(options: {
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
    lastAdminId: string | null;
}): ColumnDef<User>[] {
    const { onEdit, onDelete, lastAdminId } = options;

    return [
        {
            id: "username",
            header: "Username",
            accessorKey: "username",
            cell: ({ row }) => (
                <span className="font-display text-sm tracking-tight">{row.original.username}</span>
            ),
        },
        {
            id: "email",
            header: "Email",
            accessorKey: "email",
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">{row.original.email}</span>
            ),
        },
        {
            id: "role",
            header: "Role",
            accessorKey: "role",
            cell: ({ row }) => {
                const role = row.original.role;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold tracking-wide ${roleBadgeClass(role)}`}
                    >
                        <RoleIcon role={role} />
                        {roleLabel(role)}
                    </span>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original;
                const isLastAdmin = user.id === lastAdminId;
                const actions: Action<User>[] = [
                    {
                        key: "edit",
                        label: "Edit",
                        icon: Pencil,
                        display: ActionDisplay.Inline,
                        onClick: onEdit,
                    },
                    ...(isLastAdmin
                        ? []
                        : [
                              {
                                  key: "delete",
                                  label: "Delete",
                                  icon: Trash2,
                                  variant: ActionVariant.Destructive,
                                  display: ActionDisplay.Inline,
                                  onClick: onDelete,
                              } as Action<User>,
                          ]),
                ];
                return <ActionsCell entity={user} actions={actions} />;
            },
        },
    ];
}
