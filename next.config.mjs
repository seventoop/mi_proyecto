import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
            { protocol: "https", hostname: "images.unsplash.com" },
            { protocol: "https", hostname: "plus.unsplash.com" },
            { protocol: "https", hostname: "*.amazonaws.com" },
            { protocol: "https", hostname: "*.supabase.co" },
            { protocol: "https", hostname: "*.supabase.in" },
        ],
    },
    async redirects() {
        return [
            // ─── Legacy panel routes → unified /dashboard/portafolio ───────
            {
                source: "/dashboard/cliente",
                destination: "/dashboard/portafolio",
                permanent: true,
            },
            {
                source: "/dashboard/cliente/:path*",
                destination: "/dashboard/portafolio/:path*",
                permanent: true,
            },
            {
                source: "/dashboard/inversor",
                destination: "/dashboard/portafolio",
                permanent: true,
            },
            {
                source: "/dashboard/inversor/:path*",
                destination: "/dashboard/portafolio/:path*",
                permanent: true,
            },
            // Force /usuarios for admin user management
            {
                source: "/dashboard/admin/users",
                destination: "/dashboard/admin/usuarios",
                permanent: true,
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: "/dashboard/admin/usuarios",
                destination: "/dashboard/admin/users",
            },
        ];
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=31536000; includeSubDomains; preload",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    }
                ],
            },
        ];
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
