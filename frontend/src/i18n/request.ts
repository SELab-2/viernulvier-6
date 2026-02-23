import { hasLocale } from "next-intl";
import { getRequestConfig, GetRequestConfigParams } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }: GetRequestConfigParams) => {
    const requested: string | undefined = await requestLocale;
    const locale: "nl" | "en" = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
        timeZone: "Europe/Brussels",
    };
});
