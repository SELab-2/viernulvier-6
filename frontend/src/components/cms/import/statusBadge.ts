import type { ImportRowStatus } from "@/types/models/import.types";

export const statusBadgeClasses: Record<ImportRowStatus, string> = {
    pending: "bg-muted",
    will_create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    will_update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    will_skip: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    error: "bg-destructive/10 text-destructive",
    created: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-500",
    updated: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-500",
    skipped: "bg-muted",
    reverted: "bg-muted",
};

export const statusLabelKey: Record<ImportRowStatus, string> = {
    pending: "table.statusLabels.pending",
    will_create: "table.statusLabels.willCreate",
    will_update: "table.statusLabels.willUpdate",
    will_skip: "table.statusLabels.willSkip",
    error: "table.statusLabels.error",
    created: "table.statusLabels.created",
    updated: "table.statusLabels.updated",
    skipped: "table.statusLabels.skipped",
    reverted: "table.statusLabels.reverted",
};
