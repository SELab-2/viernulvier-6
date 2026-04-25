"use client";

interface LanguageSelectorProps<L extends string = "nl" | "en"> {
    activeLang: L;
    onChange: (lang: L) => void;
    languages?: readonly string[];
}

export function LanguageSelector<L extends string = "nl" | "en">({
    activeLang,
    onChange,
    languages = ["nl", "en"],
}: LanguageSelectorProps<L>) {
    return (
        <div className="flex items-center gap-1">
            {languages.map((lang) => (
                <button
                    key={lang}
                    onClick={() => onChange(lang as L)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                        activeLang === lang
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    {lang.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
