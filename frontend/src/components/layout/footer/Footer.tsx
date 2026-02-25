"use client";

import { cn } from "@/lib/utils";

export function Footer() {
    // Minimal footer - only shows on non-home pages
    return (
        <footer className={cn("border-border/40 border-t", "bg-background/50 backdrop-blur-sm")}>
            <div className="container mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between py-6">
                    <span
                        className={cn(
                            "text-muted-foreground/50 font-mono text-xs",
                            "tracking-widest"
                        )}
                    >
                        © {new Date().getFullYear()}
                    </span>
                    <span
                        className={cn(
                            "text-muted-foreground/50 font-mono text-xs",
                            "tracking-widest"
                        )}
                    >
                        ARCHIEF
                    </span>
                </div>
            </div>
        </footer>
    );
}
