import { createMDX } from 'fumadocs-mdx/next';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  serverExternalPackages: ['@takumi-rs/image-response'],
  reactStrictMode: true,
  // For preview: app is served at /pr-NN/docs
  // For production: app is served at /docs
  basePath: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}/docs` : '/docs',
  // Assets under /pr-NN/docs/_next so they route to docs container (not frontend)
  assetPrefix: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}/docs` : '/docs',
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withMDX(config);
