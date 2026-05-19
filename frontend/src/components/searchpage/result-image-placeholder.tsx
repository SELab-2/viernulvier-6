"use client";

interface ResultImagePlaceholderProps {
    id: string;
}

export function ResultImagePlaceholder({ id }: ResultImagePlaceholderProps) {
    return (
        <>
            <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage:
                        "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 8px)",
                }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-muted-foreground/60 font-mono text-[9px] tracking-[2px] uppercase">
                    N°{id.slice(-3)}
                </span>
            </div>
        </>
    );
}
