"use client";

import { LayoutGrid, List } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SeriesViewMode = "grid" | "list";

interface SeriesViewToggleProps {
    mode: SeriesViewMode;
    onChange: (mode: SeriesViewMode) => void;
}

export function SeriesViewToggle({ mode, onChange }: SeriesViewToggleProps) {
    const t = useTranslations("Series");

    return (
        <div className="border-muted mb-6 flex items-center justify-end gap-1 border-b pb-4">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange("grid")}
                className={cn(
                    "h-8 gap-2 px-3 font-mono text-[10px] tracking-widest uppercase transition-colors",
                    mode === "grid"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
            >
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("viewGrid")}
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange("list")}
                className={cn(
                    "h-8 gap-2 px-3 font-mono text-[10px] tracking-widest uppercase transition-colors",
                    mode === "list"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
            >
                <List className="h-3.5 w-3.5" />
                {t("viewList")}
            </Button>
        </div>
    );
}
