import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize canvas for server-side rendering
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'canvas',
      });
    }
    return config;
  },
  serverExternalPackages: ['canvas', 'pdf-img-convert', 'pdfjs-dist'],
  experimental: {
    serverComponentsExternalPackages: ['canvas', 'pdfjs-dist'],
  },
};

export default nextConfig;
