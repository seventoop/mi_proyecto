import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "node",
        include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
        globals: false,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
