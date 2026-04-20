import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { loadEnvConfig } from "@next/env";
import createNextIntlPlugin from "next-intl/plugin";
import type { Configuration, RuleSetRule } from "webpack";

// Ensure .env files are loaded before reading env vars in this config.
// next.config.ts is sometimes evaluated before Next.js loads .env.local.
loadEnvConfig(process.cwd());

const withNextIntl = createNextIntlPlugin();
const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

const s3Url = process.env.NEXT_PUBLIC_MEDIA_URL;
const s3Parsed = s3Url ? new URL(s3Url) : undefined;
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
    output: "standalone",
    reactCompiler: true,

    images: {
        dangerouslyAllowLocalIP: isDev,
        remotePatterns: [
            ...(s3Parsed
                ? [
                      {
                          protocol: s3Parsed.protocol.replace(":", "") as "http" | "https",
                          hostname: s3Parsed.hostname,
                          ...(s3Parsed.port ? { port: s3Parsed.port } : {}),
                      },
                  ]
                : []),
            // Fallback for local dev: allow any *.localhost origin (Garage S3).
            // NODE_ENV is "production" in built images so this never applies there.
            ...(isDev && !s3Parsed
                ? [{ protocol: "http" as const, hostname: "**.localhost" }]
                : []),
        ],
    },

    basePath: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}` : "",
    //assetPrefix: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}` : "",

    async redirects() {
        return [
            {
                // Redirect /pr-17 or /pr-17/ to /pr-17/nl
                source: "/",
                destination: "/nl",
                permanent: false,
            },
        ];
    },

    // Local dev env
    turbopack: {
        root: process.cwd(),
        rules: {
            "*.svg": {
                loaders: ["@svgr/webpack"],
                as: "*.js",
            },
        },
    },

    // Production build
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    webpack(config: Configuration, options) {
        // Ensure module and rules exist on the config object
        if (!config.module || !config.module.rules) return config;

        // Explicitly cast rules array
        const rules = config.module.rules as RuleSetRule[];

        // Use a strict type guard to find the SVG rule
        const fileLoaderRule = rules.find(
            (rule): rule is RuleSetRule =>
                !!rule &&
                typeof rule === "object" &&
                rule.test instanceof RegExp &&
                rule.test.test(".svg")
        );

        // Exclude SVGs from the default Next.js rule
        if (fileLoaderRule) {
            fileLoaderRule.exclude = /\.svg$/i;
        }

        // Add SVGR loader rule
        rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: ["@svgr/webpack"],
        });

        config.plugins = config.plugins || [];

        return config;
    },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
