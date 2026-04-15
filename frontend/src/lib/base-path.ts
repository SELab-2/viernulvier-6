/**
 * Returns the Next.js basePath for preview deployments.
 *
 * In preview deployments the app is served under `/<PREVIEW_NAME>`, so
 * `/login` alone would bypass Traefik's routing. Prepending the basePath
 * keeps hard-navigation redirects (window.location.assign) inside the preview.
 */
export function getBasePath(): string {
    const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return raw === "/" ? "" : raw;
}
