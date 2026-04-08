import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import type { Configuration, RuleSetRule } from "webpack";

import { codecovWebpackPlugin } from "@codecov/webpack-plugin";

const withNextIntl = createNextIntlPlugin();
const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

const s3Url = process.env.NEXT_PUBLIC_MEDIA_URL;
const s3Hostname = s3Url ? new URL(s3Url).hostname : undefined;

const nextConfig: NextConfig = {
    output: "standalone",
    reactCompiler: true,

    images: {
        remotePatterns: [
            ...(s3Hostname ? [{ protocol: "https" as const, hostname: s3Hostname }] : []),
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
    webpack(config: Configuration) {
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
        config.plugins.push(
            codecovWebpackPlugin({
                enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
                bundleName: "viernulvier-archive-frontend",
                uploadToken: process.env.CODECOV_TOKEN,
            })
        );

        return config;
    },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
