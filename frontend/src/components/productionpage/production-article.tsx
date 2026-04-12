"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { getLocalizedField } from "@/lib/locale";
import type { Production } from "@/types/models/production.types";
import type { Media } from "@/types/models/media.types";

function stripHtmlAndDecode(html: string | null | undefined): string {
    if (!html) return "";
    let text = html;

    // Replace typical break tags with newlines
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>\s*<p>/gi, "\n\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<p>/gi, "");

    // Strip all remaining HTML tags
    text = text.replace(/<[^>]*>/g, "");

    // Normalize newlines (collapse 3+ newlines down to 2)
    text = text.replace(/\n\s*\n/g, "\n\n");

    // Collapse multiple horizontal spaces
    text = text.replace(/[ \t]+/g, " ");

    return text.trim();
}

function parseInfo(info: string | null | undefined) {
    if (!info) return { credits: [], otherInfo: "" };

    const lines = info.split(/<br\s*\/?>|<\/p>\s*<p>|\n/i);
    const credits: { label: string; value: string }[] = [];
    const otherInfoLines: string[] = [];

    for (const line of lines) {
        const text = stripHtmlAndDecode(line);
        if (!text) continue;

        // Match key: value
        const match = text.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const label = match[1].trim();
            const value = match[2].trim();
            // Basic heuristics to ensure it's actually a credit and not just a sentence with a colon
            if (
                label.length < 40 &&
                !label.toLowerCase().includes("http") &&
                !label.toLowerCase().includes("€")
            ) {
                credits.push({ label, value });
                continue;
            }
        }

        // Exclude specific unwanted strings
        if (!text.toLowerCase().includes("foto ©") && !text.toLowerCase().includes("€")) {
            otherInfoLines.push(text);
        }
    }

    return {
        credits,
        otherInfo: otherInfoLines.join("\n"),
    };
}

// Helper to render text with double newlines as paragraphs
// We use dangerouslySetInnerHTML so that HTML entities like &eacute; or &euro; are naturally decoded by the browser
function TextBlocks({ text, className }: { text: string; className?: string }) {
    if (!text) return null;
    const blocks = text.split("\n\n").filter((b) => b.trim());

    return (
        <div className={className}>
            {blocks.map((block, i) => (
                <p key={i}>
                    {block.split("\n").map((line, j) => (
                        <span key={j}>
                            <span dangerouslySetInnerHTML={{ __html: line }} />
                            {j !== block.split("\n").length - 1 && <br />}
                        </span>
                    ))}
                </p>
            ))}
        </div>
    );
}

export function ProductionArticle({
    production,
    locale,
    media = [],
}: {
    production: Production;
    locale: string;
    media?: Media[];
}) {
    const t = useTranslations("ProductionPage");

    const description = stripHtmlAndDecode(getLocalizedField(production, "description", locale));
    const descriptionExtra = stripHtmlAndDecode(
        getLocalizedField(production, "descriptionExtra", locale)
    );
    const teaser = stripHtmlAndDecode(getLocalizedField(production, "teaser", locale));
    const descriptionShort = stripHtmlAndDecode(
        getLocalizedField(production, "descriptionShort", locale)
    );
    const tagline = stripHtmlAndDecode(getLocalizedField(production, "tagline", locale));
    const quote = stripHtmlAndDecode(getLocalizedField(production, "quote", locale));
    const quoteSource = stripHtmlAndDecode(getLocalizedField(production, "quoteSource", locale));

    const info = getLocalizedField(production, "info", locale);
    const { credits: parsedCredits, otherInfo } = parseInfo(info);

    const videos = [production.video1, production.video2].filter(Boolean) as string[];

    return (
        <div className="max-w-3xl">
            {/* Section Rule */}
            <div className="mb-5 flex items-center gap-3.5">
                <h2 className="text-muted-foreground font-mono text-[9px] font-medium tracking-[2px] whitespace-nowrap uppercase">
                    {t("about")}
                </h2>
                <div className="bg-muted/25 h-px flex-1" />
            </div>

            {tagline && (
                <TextBlocks
                    text={tagline}
                    className="font-display text-muted-foreground mb-4 text-[22px] leading-[1.4] font-medium italic"
                />
            )}

            {(descriptionShort || teaser) && (
                <TextBlocks
                    text={teaser || descriptionShort}
                    className="font-display text-foreground mb-6 text-[18px] leading-[1.65] font-normal"
                />
            )}

            <div className="font-body text-foreground/80 mb-8 gap-8 text-[14px] leading-[1.75] font-normal lg:columns-2">
                {description && <TextBlocks text={description} className="mb-4 space-y-3.5" />}

                {quote && (
                    <div className="border-foreground my-7 break-inside-avoid border-l-3 py-3 pl-5">
                        <TextBlocks
                            text={`"${quote}"`}
                            className="font-display text-foreground mb-2 text-[18px] leading-[1.55] italic"
                        />
                        {quoteSource && (
                            <cite className="text-muted-foreground block font-mono text-[9px] tracking-[1.2px] uppercase not-italic">
                                — <span dangerouslySetInnerHTML={{ __html: quoteSource }} />
                            </cite>
                        )}
                    </div>
                )}

                {descriptionExtra && <TextBlocks text={descriptionExtra} className="space-y-3.5" />}

                {otherInfo && (
                    <div className="bg-muted/5 border-muted/20 text-muted-foreground mt-4 break-inside-avoid border p-4 text-[13px]">
                        <TextBlocks text={otherInfo} className="space-y-2" />
                    </div>
                )}

                {/* Fallback if no description */}
                {!description && !descriptionShort && !descriptionExtra && !teaser && (
                    <p className="text-muted-foreground italic">{t("noDescription")}</p>
                )}
            </div>

            {/* Gallery */}
            {media.length > 0 && (
                <div className="my-8 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {media.map((m) => {
                        const alt =
                            (locale === "nl"
                                ? m.altTextNl
                                : locale === "fr"
                                  ? m.altTextFr
                                  : m.altTextEn) ?? "";
                        return (
                            <div
                                key={m.id}
                                className="group relative aspect-[4/3] overflow-hidden bg-[#ccc6bc]"
                            >
                                {m.url ? (
                                    <Image
                                        src={m.url}
                                        alt={alt}
                                        fill
                                        className="object-cover grayscale-[15%] transition-all duration-300 group-hover:grayscale-0"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-tr from-[#CCC6BC] to-[#B5AEA4]" />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
                <div className="mt-10 mb-10">
                    <div className="mb-5 flex items-center gap-3.5">
                        <h2 className="text-muted-foreground font-mono text-[9px] font-medium tracking-[2px] whitespace-nowrap uppercase">
                            {t("video")}
                        </h2>
                        <div className="bg-muted/25 h-px flex-1" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {videos.map((v, i) => (
                            <a
                                key={i}
                                href={v}
                                target="_blank"
                                rel="noreferrer"
                                className="group border-border hover:border-foreground flex flex-col border p-4 transition-colors"
                            >
                                <span className="text-muted-foreground group-hover:text-foreground mb-2 font-mono text-[10px] uppercase">
                                    {t("externalVideoLink")}
                                </span>
                                <span className="font-body text-foreground truncate text-[13px]">
                                    {v}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Credits Section */}
            <div className="mt-10 mb-5 flex items-center gap-3.5">
                <h2 className="text-muted-foreground font-mono text-[9px] font-medium tracking-[2px] whitespace-nowrap uppercase">
                    {t("credits")}
                </h2>
                <div className="bg-muted/25 h-px flex-1" />
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="mb-2">
                    <div className="text-muted-foreground mb-0.5 font-mono text-[8px] tracking-[1.6px] uppercase">
                        {t("creditProduction")}
                    </div>
                    <div
                        className="font-body text-foreground text-[13px] font-medium"
                        dangerouslySetInnerHTML={{
                            __html: getLocalizedField(production, "title", locale) ?? "-",
                        }}
                    />
                </div>
                <div className="mb-2">
                    <div className="text-muted-foreground mb-0.5 font-mono text-[8px] tracking-[1.6px] uppercase">
                        {t("creditArtist")}
                    </div>
                    <div
                        className="font-body text-foreground text-[13px] font-medium"
                        dangerouslySetInnerHTML={{
                            __html: getLocalizedField(production, "artist", locale) ?? "-",
                        }}
                    />
                </div>

                {parsedCredits.map((credit, idx) => (
                    <div className="mb-2" key={idx}>
                        <div
                            className="text-muted-foreground mb-0.5 font-mono text-[8px] tracking-[1.6px] uppercase"
                            dangerouslySetInnerHTML={{ __html: credit.label }}
                        />
                        <div
                            className="font-body text-foreground text-[13px] font-medium"
                            dangerouslySetInnerHTML={{ __html: credit.value }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
