import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { TIMEZONE } from "@/constants/i18n.constants";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
    const locale = hasLocale(routing.locales, requestLocale)
        ? requestLocale
        : routing.defaultLocale;

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
        timeZone: TIMEZONE,
    };
});
