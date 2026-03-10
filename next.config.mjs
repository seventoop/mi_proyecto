import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Leaflet is a CJS-only package that Next.js can't resolve without explicit transpilation
    transpilePackages: ["leaflet"],
    typescript: {
        ignoreBuildErrors: false,
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
            // Alias tfjs-node to tfjs to avoid binary build issues on some environments
            config.resolve.alias['@tensorflow/tfjs-node'] = '@tensorflow/tfjs';
        } else {
            // 🛡️ Security & Size: Exclude heavy machine learning libs from client bundle
            config.resolve.alias['@tensorflow/tfjs'] = false;
            config.resolve.alias['@tensorflow/tfjs-backend-webgl'] = false;
            config.resolve.alias['upscaler'] = false;
        }
        return config;
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "plus.unsplash.com",
            }
        ],
    },
};

export default withSentryConfig(nextConfig, {
    silent: true,
    org: "seventoop", // Example org
    project: "seventoop", // Example project
}, {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
});
