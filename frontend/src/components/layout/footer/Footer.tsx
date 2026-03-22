"use client";

export function Footer() {
    return (
        <footer className="border-foreground flex items-center justify-between border-t-2 px-10 py-6">
            <div className="font-display text-lg font-bold">VIERNULVIER</div>
            <div className="text-muted-foreground text-right font-mono text-[9px] leading-[1.8] tracking-[1.2px] uppercase">
                Kunstencentrum VIERNULVIER vzw · Sint-Pietersnieuwstraat 23 · 9000 Gent
                <br />
                T. 09 267 28 20 · info@viernulvier.gent · BTW BE 0423.063.619
            </div>
        </footer>
    );
}
