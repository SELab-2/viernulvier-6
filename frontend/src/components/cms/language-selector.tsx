"use client";

interface LanguageSelectorProps {
    activeLang: "nl" | "en";
    onChange: (lang: "nl" | "en") => void;
}

export function LanguageSelector({ activeLang, onChange }: LanguageSelectorProps) {
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => onChange("nl")}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                    activeLang === "nl"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                }`}
            >
                NL
            </button>
            <button
                onClick={() => onChange("en")}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                    activeLang === "en"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                }`}
            >
                EN
            </button>
        </div>
    );
}
