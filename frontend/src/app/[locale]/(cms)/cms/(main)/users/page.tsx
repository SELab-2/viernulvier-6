"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import type { RowSelectionState } from "@tanstack/react-table";
import { PageHeader } from "@/components/cms/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DataTable } from "../../tables/data-table";
import { ActionBar } from "../../tables/action-bar";
import { makeUserColumns } from "./columns";
import {
    useGetUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    type User,
    type UserRole,
} from "@/hooks/api/useUsers";
import { useUser } from "@/hooks/useAuth";
import { UserRole as UserRoleEnum } from "@/types/models/user.types";

const ROLE_OPTIONS: UserRole[] = ["admin", "editor", "user"];

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

export default function UsersPage() {
    const t = useTranslations("Cms.Users");
    const tCommon = useTranslations("Cms.common");
    const tEditions = useTranslations("Cms.editions");
    const router = useRouter();
    const { data: currentUser, isLoading: userLoading } = useUser();
    const canManageUsers = currentUser?.role === UserRoleEnum.ADMIN;
    const { data: users = [], isLoading } = useGetUsers({
        enabled: canManageUsers,
        retry: false,
    });
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const deleteUser = useDeleteUser();

    useEffect(() => {
        if (userLoading) {
            return;
        }
        if (!currentUser) {
            router.push("/login");
            return;
        }
        if (currentUser.role !== UserRoleEnum.ADMIN) {
            router.push("/cms");
        }
    }, [userLoading, currentUser, router]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        role: "editor" as UserRole,
    });

    const resetForm = useCallback(() => {
        setForm({ username: "", email: "", password: "", role: "editor" });
        setEditingUser(null);
    }, []);

    const openCreate = useCallback(() => {
        resetForm();
        setDialogOpen(true);
    }, [resetForm]);

    const openEdit = useCallback((user: User) => {
        setEditingUser(user);
        setForm({ username: user.username, email: user.email, password: "", role: user.role });
        setDialogOpen(true);
    }, []);

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (editingUser) {
                updateUser.mutate(
                    { id: editingUser.id, payload: { username: form.username, role: form.role } },
                    {
                        onSuccess: () => {
                            toast.success(t("updateSuccess"));
                            setDialogOpen(false);
                            resetForm();
                        },
                        onError: () => toast.error(t("updateError")),
                    }
                );
            } else {
                createUser.mutate(
                    {
                        username: form.username,
                        email: form.email,
                        password: form.password,
                        role: form.role,
                    },
                    {
                        onSuccess: () => {
                            toast.success(t("createSuccess"));
                            setDialogOpen(false);
                            resetForm();
                        },
                        onError: () => toast.error(t("createError")),
                    }
                );
            }
        },
        [editingUser, form, createUser, updateUser, t, resetForm]
    );

    const lastAdminId = useMemo(() => {
        const admins = users.filter((u) => u.role === "admin");
        return admins.length === 1 ? (admins[0]?.id ?? null) : null;
    }, [users]);

    const handleDelete = useCallback(
        (user: User) => {
            if (user.id === lastAdminId) {
                toast.error(t("deleteLastAdminError"));
                return;
            }
            if (window.confirm(t("deleteConfirm", { name: user.username }))) {
                deleteUser.mutate(user.id, {
                    onSuccess: () => toast.success(t("deleteSuccess")),
                    onError: () => toast.error(t("deleteError")),
                });
            }
        },
        [deleteUser, t, lastAdminId]
    );

    const columns = useMemo(
        () => makeUserColumns({ onEdit: openEdit, onDelete: handleDelete, lastAdminId, t }),
        [openEdit, handleDelete, lastAdminId, t]
    );

    if (userLoading || !canManageUsers) {
        return null;
    }

    return (
        <div className="flex h-full flex-col px-3 py-1 lg:px-4 lg:py-3">
            <PageHeader eyebrow={tEditions("edition7")} title={t("title")} />

            <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2 py-2">
                <ActionBar entityCounts={[]} actions={[]} onClear={() => {}} />
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    {t("newUser")}
                </Button>
            </div>

            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={columns}
                    data={users}
                    loading={isLoading}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(row) => row.id}
                />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? t("editUser") : t("newUser")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="user-username">{t("username")}</Label>
                            <Input
                                id="user-username"
                                value={form.username}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, username: e.target.value }))
                                }
                                required
                            />
                        </div>

                        {!editingUser && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="user-email">{t("email")}</Label>
                                    <Input
                                        id="user-email"
                                        type="email"
                                        value={form.email}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, email: e.target.value }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="user-password">{t("password")}</Label>
                                    <Input
                                        id="user-password"
                                        type="password"
                                        value={form.password}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, password: e.target.value }))
                                        }
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="user-role">{t("role")}</Label>
                            <Select
                                value={form.role}
                                onValueChange={(v) =>
                                    setForm((f) => ({ ...f, role: v as UserRole }))
                                }
                                disabled={editingUser?.id === lastAdminId}
                            >
                                <SelectTrigger id="user-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLE_OPTIONS.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {roleLabel(r)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editingUser?.id === lastAdminId && (
                                <p className="text-muted-foreground text-xs">
                                    {t("lastAdminRoleHint")}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDialogOpen(false);
                                    resetForm();
                                }}
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={createUser.isPending || updateUser.isPending}
                            >
                                {editingUser
                                    ? t("save")
                                    : createUser.isPending
                                      ? tCommon("saving")
                                      : t("create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
