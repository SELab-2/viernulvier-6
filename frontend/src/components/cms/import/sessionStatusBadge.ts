import type { ImportSessionStatus } from "@/types/models/import.types";

export const SESSION_STATUS_CLASSES: Record<ImportSessionStatus, string> = {
    uploaded: "bg-muted",
    mapping: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    dry_run_pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dry_run_ready: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    committing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    committed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted",
};
