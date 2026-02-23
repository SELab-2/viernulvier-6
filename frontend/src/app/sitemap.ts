import type { MetadataRoute } from "next";

import { env } from "@/env";

export default function sitemap(): MetadataRoute.Sitemap {
    // TODO: Add all urls
    return [
        {
            url: `${env.NEXT_PUBLIC_SITE_URL}/`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 1,
            alternates: {
                languages: {
                    nl: `${env.NEXT_PUBLIC_SITE_URL}/nl`,
                    en: `${env.NEXT_PUBLIC_SITE_URL}/en`,
                },
            },
        },
    ];
}
