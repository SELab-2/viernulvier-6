import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {};

const withNextIntl: (nextConfig?: NextConfig) => NextConfig = createNextIntlPlugin();
export default withNextIntl(nextConfig);
