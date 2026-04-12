import { SUPPORTED_LOCALES } from "@/constants/i18n.constants";

/**
 * infers the nextjs basePath from the current window location. In preview
 * deployments the app is served under `/<PREVIEW_NAME>`, so `/login` alone
 * would bypass Traefik's routing. Prepending the inferred basePath keeps
 * hard-navigation redirects (window.location.assign) inside the preview.
 */
export function getBasePath(): string {
    if (typeof window === "undefined") return "";
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "";
    const locales = SUPPORTED_LOCALES as readonly string[];
    return locales.includes(segments[0]) ? "" : `/${segments[0]}`;
}
