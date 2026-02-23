import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import type { Configuration, RuleSetRule } from "webpack";

const withNextIntl = createNextIntlPlugin();
const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
    output: "standalone",
    reactCompiler: true,

    basePath: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}` : '',
    assetPrefix: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}` : '',

    async redirects() {
        return [
            {
                // Redirect /pr-17 or /pr-17/ to /pr-17/nl
                source: '/',
                destination: '/nl',
                permanent: false,
            },
        ]
    },

    // Local dev env
    turbopack: {
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

        return config;
    },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));