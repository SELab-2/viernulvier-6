import Link from "next/link";
import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function NotFound() {
    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
            <VintageEmptyState
                title="404 - Pagina niet gevonden"
                description="De pagina die u zoekt bestaat niet (meer) in ons archief of is verplaatst."
                imagePath="/images/de_vooruit_decaying.png"
                action={
                    <Link
                        href="/"
                        className="border-foreground text-foreground hover:bg-foreground hover:text-background inline-block border px-6 py-2.5 font-mono text-[10px] font-medium tracking-[1.4px] uppercase transition-all"
                    >
                        Terug naar start
                    </Link>
                }
            />
        </div>
    );
}
