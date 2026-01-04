import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      // R2 - Portfolio（イラスト・作品用）
      {
        protocol: 'https',
        hostname: 'portfolio.doujinworks.jp',
      },
      // R2 - Profiles（プロフィール画像用）
      {
        protocol: 'https',
        hostname: 'profiles.doujinworks.jp',
      },
      // R2 - Pricing（料金表画像用）
      {
        protocol: 'https',
        hostname: 'pricing.doujinworks.jp',
      },
      // R2 - Deliveries（納品ファイル用）
      {
        protocol: 'https',
        hostname: 'deliveries.doujinworks.jp',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.doujinworks.jp',
          },
        ],
        destination: 'https://doujinworks.jp/:path*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;