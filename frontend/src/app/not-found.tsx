import Link from "next/link";

export default function NotFound() {
    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
            <span className="text-muted-foreground font-mono text-[9px] tracking-[2px] uppercase">
                Page not found
            </span>
            <h1 className="font-display text-foreground text-[64px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[96px]">
                404
            </h1>
            <p className="text-muted-foreground max-w-[400px] text-sm leading-relaxed sm:text-base">
                The page you&#39;re looking for doesn&#39;t exist or has been moved.
            </p>
            <Link
                href="/"
                className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-2 inline-block border px-6 py-2.5 font-mono text-[10px] font-medium tracking-[1.4px] uppercase transition-all"
            >
                Back to home
            </Link>
        </div>
    );
}
