import React from "react";
import Image from "next/image";

interface VintageEmptyStateProps {
    title: string;
    description: string;
    imagePath?: string;
    action?: React.ReactNode;
}

export function VintageEmptyState({
    title,
    description,
    imagePath = "/de_vooruit_decaying.png",
    action,
}: VintageEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-12">
            <article className="border-foreground mx-auto w-full max-w-[650px] border-x border-t-4 border-b p-6 sm:p-8">
                {/* Newspaper Header */}
                <header className="border-foreground mb-6 flex flex-col items-center border-b-[3px] pb-6 text-center">
                    <span className="text-foreground mb-3 font-mono text-[10px] font-bold tracking-[4px] uppercase">
                        Vooruit Archief
                    </span>
                    <h2 className="font-display text-foreground max-w-full text-[32px] leading-[1.1] font-black tracking-tight break-words uppercase sm:text-[46px]">
                        {title}
                    </h2>

                    {/* Newspaper Dateline */}
                    <div className="border-foreground text-foreground mt-6 flex w-full items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-widest uppercase sm:text-[10px]">
                        <span>Editie 404</span>
                        <span>Archiefdienst</span>
                        <span>Prijs: Onschatbaar</span>
                    </div>
                </header>

                {/* Article Content */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                        <p className="font-body text-foreground text-sm leading-relaxed break-words sm:text-justify">
                            <span className="font-display text-foreground float-left mt-[-4px] mr-2 text-[48px] leading-none font-bold">
                                {description.charAt(0)}
                            </span>
                            {description.slice(1)}
                        </p>
                        {action && <div className="mt-8 text-center sm:text-left">{action}</div>}
                    </div>

                    {/* Image */}
                    <div className="w-full shrink-0 sm:w-[260px]">
                        <figure className="border-foreground border p-1">
                            <div
                                className="relative w-full"
                                style={{ filter: "grayscale(1) contrast(1.15) sepia(0.1)" }}
                            >
                                <Image
                                    src={imagePath}
                                    alt="Archiefbeeld"
                                    width={300}
                                    height={400}
                                    className="h-auto w-full object-cover"
                                    priority
                                />
                            </div>
                            <figcaption className="border-foreground text-muted-foreground mt-1 border-t pt-1 text-center font-mono text-[9px] tracking-wider uppercase">
                                Beeld uit het archief
                            </figcaption>
                        </figure>
                    </div>
                </div>
            </article>
        </div>
    );
}
