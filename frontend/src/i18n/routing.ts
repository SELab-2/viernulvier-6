import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/constants/i18n.constants";

export const routing = defineRouting({
    locales: SUPPORTED_LOCALES,
    defaultLocale: DEFAULT_LOCALE,
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
