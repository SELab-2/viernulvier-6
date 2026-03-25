import { getLocalizedField } from "@/lib/locale";
import type { Production } from "@/types/models/production.types";

export function ProductionArticle({
    production,
    locale,
}: {
    production: Production;
    locale: string;
}) {
    const description = getLocalizedField(production, "description", locale);
    const descriptionShort = getLocalizedField(production, "descriptionShort", locale);
    const descriptionExtra = getLocalizedField(production, "descriptionExtra", locale);
    const quote = getLocalizedField(production, "quote", locale);
    const quoteSource = getLocalizedField(production, "quoteSource", locale);

    return (
        <div className="max-w-3xl">
            {/* Section Rule */}
            <div className="mb-5 flex items-center gap-3.5">
                <h2 className="text-muted-foreground font-mono text-[9px] font-medium tracking-[2px] whitespace-nowrap uppercase">
                    Over de productie
                </h2>
                <div className="bg-muted/25 h-px flex-1" />
            </div>

            {descriptionShort && (
                <p className="font-display text-foreground mb-6 text-[18px] leading-[1.65] font-normal">
                    {descriptionShort}
                </p>
            )}

            <div className="font-body text-foreground/80 mb-8 gap-8 text-[14px] leading-[1.75] font-normal lg:columns-2">
                {description && (
                    <div
                        className="mb-4 space-y-3.5"
                        dangerouslySetInnerHTML={{ __html: description }}
                    />
                )}

                {quote && (
                    <div className="border-foreground my-7 break-inside-avoid border-l-3 py-3 pl-5">
                        <p className="font-display text-foreground mb-2 text-[18px] leading-[1.55] italic">
                            &quot;{quote}&quot;
                        </p>
                        {quoteSource && (
                            <cite className="text-muted-foreground block font-mono text-[9px] tracking-[1.2px] uppercase not-italic">
                                — {quoteSource}
                            </cite>
                        )}
                    </div>
                )}

                {descriptionExtra && (
                    <div
                        className="space-y-3.5"
                        dangerouslySetInnerHTML={{ __html: descriptionExtra }}
                    />
                )}

                {/* Fallback if no description */}
                {!description && !descriptionShort && !descriptionExtra && (
                    <p className="text-muted-foreground italic">
                        Geen beschrijving beschikbaar in deze taal.
                    </p>
                )}
            </div>

            {/* Gallery placeholder */}
            <div className="my-8 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="group aspect-[4/3] overflow-hidden bg-[#ccc6bc]">
                    <div className="h-full w-full bg-gradient-to-tr from-[#CCC6BC] to-[#B5AEA4] grayscale-[15%] transition-all duration-300 group-hover:grayscale-0" />
                </div>
                <div className="group aspect-[4/3] overflow-hidden bg-[#ccc6bc]">
                    <div className="h-full w-full bg-gradient-to-tr from-[#CCC6BC] to-[#B5AEA4] grayscale-[15%] transition-all duration-300 group-hover:grayscale-0" />
                </div>
                <div className="group aspect-[4/3] overflow-hidden bg-[#ccc6bc]">
                    <div className="h-full w-full bg-gradient-to-tr from-[#CCC6BC] to-[#B5AEA4] grayscale-[15%] transition-all duration-300 group-hover:grayscale-0" />
                </div>
            </div>

            {/* Credits Section */}
            <div className="mt-10 mb-5 flex items-center gap-3.5">
                <h2 className="text-muted-foreground font-mono text-[9px] font-medium tracking-[2px] whitespace-nowrap uppercase">
                    Credits
                </h2>
                <div className="bg-muted/25 h-px flex-1" />
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                {/* Hardcoded credits or use available fields like programme */}
                <div className="mb-2">
                    <div className="text-muted-foreground mb-0.5 font-mono text-[8px] tracking-[1.6px] uppercase">
                        Productie
                    </div>
                    <div className="font-body text-foreground text-[13px] font-medium">
                        {getLocalizedField(production, "title", locale) ?? "-"}
                    </div>
                </div>
                <div className="mb-2">
                    <div className="text-muted-foreground mb-0.5 font-mono text-[8px] tracking-[1.6px] uppercase">
                        Artiest
                    </div>
                    <div className="font-body text-foreground text-[13px] font-medium">
                        {getLocalizedField(production, "artist", locale) ?? "-"}
                    </div>
                </div>
                {production.video1 && (
                    <div className="mb-2">
                        <div className="text-muted-foreground mb-0.5 font-mono text-[8px] tracking-[1.6px] uppercase">
                            Video link
                        </div>
                        <div className="font-body text-foreground truncate text-[13px] font-medium">
                            <a
                                href={production.video1}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                            >
                                {production.video1}
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
