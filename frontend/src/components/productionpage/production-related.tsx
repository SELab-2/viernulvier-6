import { Link } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/locale";
import type { Production } from "@/types/models/production.types";

export function ProductionRelated({
    productions,
    locale,
}: {
    productions: Production[];
    locale: string;
}) {
    return (
        <div className="border-foreground bg-background border-t-2 px-6 py-10 sm:px-10 sm:py-12">
            <div className="mb-6 flex items-baseline justify-between">
                <h2 className="font-display text-foreground text-[22px] font-bold tracking-[-0.02em]">
                    Meer uit het archief
                </h2>
                <Link
                    href="/search"
                    className="text-muted-foreground hover:text-foreground font-mono text-[9px] tracking-[1.4px] uppercase transition-colors"
                >
                    Bekijk alles →
                </Link>
            </div>

            <div className="bg-muted/30 border-muted/30 grid grid-cols-1 gap-[1px] border sm:grid-cols-2 lg:grid-cols-4">
                {productions.map((p) => {
                    const title = getLocalizedField(p, "title", locale) ?? p.slug;
                    const artist = getLocalizedField(p, "artist", locale);

                    return (
                        <Link
                            key={p.id}
                            href={`/productions/${p.id}`}
                            className="bg-background hover:bg-muted/5 group block cursor-pointer p-4 transition-colors"
                        >
                            <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden bg-[#ccc6bc]">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#CCC6BC] to-[#B5AEA4] grayscale-[15%] transition-all duration-300 group-hover:grayscale-0" />
                            </div>
                            <div className="text-muted-foreground mb-1.5 line-clamp-1 font-mono text-[8px] tracking-[1.4px] uppercase">
                                {p.uitdatabankType ?? "Productie"} · Archief
                            </div>
                            <div className="font-display text-foreground mb-0.5 line-clamp-2 text-[16px] leading-[1.2] font-bold tracking-[-0.02em]">
                                {title}
                            </div>
                            {artist && (
                                <div className="font-display text-foreground/40 mb-2 line-clamp-1 text-[16px] leading-[1.2] font-bold italic">
                                    {artist}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
