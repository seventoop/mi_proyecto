import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: false,
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Alias tfjs-node to tfjs to avoid binary build issues on some environments
            config.resolve.alias['@tensorflow/tfjs-node'] = '@tensorflow/tfjs';
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
