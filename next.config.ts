import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage（唯一の必須設定）
      {
        protocol: 'https',
        hostname: '*.supabase.co',
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