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
  // Traefik routes /docs to this app, so no basePath needed
  // The app serves content at root level ( Traefik handles the /docs prefix externally)
  basePath: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}/docs` : '',
  assetPrefix: process.env.PREVIEW_NAME ? `/${process.env.PREVIEW_NAME}/docs` : '',
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
