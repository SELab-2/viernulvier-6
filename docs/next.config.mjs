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
  basePath: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}/docs` : '/docs',
  assetPrefix: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}/docs` : '/docs',
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/:path*.mdx',
        destination: '/llms.mdx/:path*',
      },
    ];
  },
};

export default withMDX(config);
