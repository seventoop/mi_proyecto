/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["leaflet"],
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        optimizePackageImports: [
            "lucide-react",
            "framer-motion",
            "date-fns",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
        ],
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.resolve.alias['@tensorflow/tfjs-node'] = '@tensorflow/tfjs';
        } else {
            config.resolve.alias['@tensorflow/tfjs'] = false;
            config.resolve.alias['@tensorflow/tfjs-backend-webgl'] = false;
            config.resolve.alias['upscaler'] = false;
        }
        return config;
    },
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "images.unsplash.com" },
            { protocol: "https", hostname: "plus.unsplash.com" },
            { protocol: "https", hostname: "*.amazonaws.com" },
            { protocol: "https", hostname: "*.supabase.co" },
            { protocol: "https", hostname: "*.supabase.in" },
            { protocol: "https", hostname: "*.replit.dev" },
            { protocol: "https", hostname: "*.replit.app" },
        ],
    },
};

export default nextConfig;
