"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Shield, User as UserIcon, PenLine } from "lucide-react";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";
import type { User, UserRole } from "@/hooks/api/useUsers";
import { makeActionsColumn } from "../../tables/actions-column";

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

export function makeUserColumns(options: {
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
    lastAdminId: string | null;
    t: (key: "username" | "email" | "role" | "edit" | "delete") => string;
}): ColumnDef<User>[] {
    const { onEdit, onDelete, lastAdminId, t } = options;

    return [
        {
            id: "username",
            header: t("username"),
            accessorKey: "username",
            cell: ({ row }) => (
                <span className="font-display text-sm tracking-tight">{row.original.username}</span>
            ),
        },
        {
            id: "email",
            header: t("email"),
            accessorKey: "email",
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">{row.original.email}</span>
            ),
        },
        {
            id: "role",
            header: t("role"),
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
            ...makeActionsColumn<User>({
                actions: (user) => [
                    {
                        key: "edit",
                        label: t("edit"),
                        icon: Pencil,
                        display: ActionDisplay.Inline,
                        onClick: onEdit,
                    },
                    ...(user.id === lastAdminId
                        ? []
                        : [
                              {
                                  key: "delete",
                                  label: t("delete"),
                                  icon: Trash2,
                                  variant: ActionVariant.Destructive,
                                  display: ActionDisplay.Inline,
                                  onClick: onDelete,
                              } as Action<User>,
                          ]),
                ],
            }),
        },
    ];
}
