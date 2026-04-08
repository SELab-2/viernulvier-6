import Link from "next/link";
import { useTranslations } from "next-intl";

import { VintageEmptyState } from "@/components/shared/vintage-empty-state";

export default function NotFound() {
    const t = useTranslations("PageNotFound");

    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
            <VintageEmptyState
                title={t("title")}
                description={t("description")}
                imagePath="/images/de_vooruit_decaying.png"
                action={
                    <Link
                        href="/"
                        className="border-foreground text-foreground hover:bg-foreground hover:text-background inline-block border px-6 py-2.5 font-mono text-[10px] font-medium tracking-[1.4px] uppercase transition-all"
                    >
                        {t("backToHome")}
                    </Link>
                }
                caption={t("articleImageCaption")}
            />
        </div>
    );
}
