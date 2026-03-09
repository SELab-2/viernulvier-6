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
  basePath: '/docs',
  // For preview deployments, assets need to be loaded from the preview prefix
  assetPrefix: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}` : undefined,
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        // Relative to basePath (/docs)
        source: '/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withMDX(config);
