import type { SiteConfig } from "@/types/site-config.types";
import { DEFAULT_LOCALE } from "@/constants/i18n.constants";
import { env } from "@/env";

export const siteConfig: SiteConfig = {
    name: "Viernulvier Archive",
    description: "Public archive for all past shows and productions organized by viernulvier.",
    url: env.NEXT_PUBLIC_SITE_URL,
    locale: DEFAULT_LOCALE,
    themeColor: "#ffffff",
    keywords: ["viernulvier", "art", "archive", "kunst", "archief"],
    social: {
        linkedin: "viernulviergent"
    },
    //ogImage: "/og.jpg",
    languages: {
        nl: "/nl",
        en: "/en",
        "x-default": "/nl"
    }
} as const;