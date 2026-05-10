"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TagFormSheet } from "./tag-form-sheet";
import { DeleteTagDialog } from "./delete-tag-dialog";
import { useCreateTag, useDeleteTag, useUpdateTag } from "@/hooks/api/useTaxonomy";
import { Facet as FacetSlugType, Tag } from "@/types/models/taxonomy.types";
import { Facet as ApiFacetEnum } from "@/types/api/taxonomy.api.types";

interface TagManagementSheetProps {
    open: boolean;
    facet: FacetSlugType;
    onOpenChange: (open: boolean) => void;
    openWithCreate?: string;
}

type FormMode = { type: "create"; prefill?: string } | { type: "edit"; tag: Tag };

export function TagManagementSheet({
    open,
    facet,
    onOpenChange,
    openWithCreate,
}: TagManagementSheetProps) {
    const locale = useLocale();
    // openWithCreate is a one-shot initializer. To re-arm the create flow with a new
    // prefill value, the parent should change the component's `key` prop.
    const [formMode, setFormMode] = React.useState<FormMode | null>(() =>
        openWithCreate !== undefined ? { type: "create", prefill: openWithCreate } : null
    );
    const [deleteTarget, setDeleteTarget] = React.useState<{
        tag: Tag;
        usageCount: number;
    } | null>(null);
    const [formError, setFormError] = React.useState<string | undefined>();

    const createTag = useCreateTag();
    const updateTag = useUpdateTag();
    const deleteTag = useDeleteTag();

    const getLabel = (tag: Tag) =>
        tag.translations.find((t) => t.languageCode === locale)?.label ??
        tag.translations[0]?.label ??
        tag.slug;

    const getFacetLabel = () =>
        facet.translations.find((t) => t.languageCode === locale)?.label ?? facet.slug;

    const handleFormSubmit = async ({ nl, en }: { nl: string; en: string }) => {
        setFormError(undefined);
        const translations = [
            { language_code: "nl", label: nl },
            { language_code: "en", label: en },
        ];
        try {
            if (formMode?.type === "create") {
                await createTag.mutateAsync({
                    facet: facet.slug as ApiFacetEnum,
                    translations,
                });
            } else if (formMode?.type === "edit") {
                await updateTag.mutateAsync({
                    slug: formMode.tag.slug,
                    translations,
                });
            }
            setFormMode(null);
        } catch {
            setFormError("A tag with this name already exists");
        }
    };

    const handleDeleteClick = async (tag: Tag) => {
        try {
            const result = await deleteTag.mutateAsync({ slug: tag.slug, force: false });
            if (result?.usage_count && result.usage_count > 0) {
                setDeleteTarget({ tag, usageCount: result.usage_count });
            } else {
                toast.success("Tag deleted");
            }
        } catch {
            toast.error("Failed to delete tag");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            await deleteTag.mutateAsync({ slug: deleteTarget.tag.slug, force: true });
            toast.success("Tag deleted");
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to delete tag");
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-96">
                    <SheetHeader>
                        <SheetTitle>Manage tags — {getFacetLabel()}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="mb-4 w-full"
                            onClick={() => setFormMode({ type: "create" })}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New tag
                        </Button>
                        <div className="space-y-1">
                            {facet.tags.map((tag) => (
                                <div
                                    key={tag.slug}
                                    className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5"
                                >
                                    <span className="text-sm">{getLabel(tag)}</span>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            aria-label={`Edit ${getLabel(tag)}`}
                                            onClick={() => setFormMode({ type: "edit", tag })}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive h-7 w-7"
                                            aria-label={`Delete ${getLabel(tag)}`}
                                            onClick={() => handleDeleteClick(tag)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <TagFormSheet
                key={formMode?.type === "edit" ? formMode.tag.slug : "create"}
                open={formMode !== null}
                facetLabel={getFacetLabel()}
                onOpenChange={(o) => !o && setFormMode(null)}
                onSubmit={handleFormSubmit}
                isSubmitting={createTag.isPending || updateTag.isPending}
                initialValues={
                    formMode?.type === "edit"
                        ? {
                              nl:
                                  formMode.tag.translations.find((t) => t.languageCode === "nl")
                                      ?.label ?? "",
                              en:
                                  formMode.tag.translations.find((t) => t.languageCode === "en")
                                      ?.label ?? "",
                          }
                        : formMode?.type === "create" && formMode.prefill
                          ? { nl: formMode.prefill, en: "" }
                          : undefined
                }
                errorMessage={formError}
            />

            {deleteTarget && (
                <DeleteTagDialog
                    open={true}
                    tagLabel={getLabel(deleteTarget.tag)}
                    usageCount={deleteTarget.usageCount}
                    isDeleting={deleteTag.isPending}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    );
}
