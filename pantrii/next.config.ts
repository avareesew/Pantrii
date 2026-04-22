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
  // For Next 15+, use only serverExternalPackages (experimental.serverComponentsExternalPackages is deprecated)
  serverExternalPackages: ["canvas", "pdf-img-convert", "pdfjs-dist"],
};

export default nextConfig;
