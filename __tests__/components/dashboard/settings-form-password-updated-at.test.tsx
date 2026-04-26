// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";

vi.mock("next-auth/react", () => ({
    useSession: () => ({
        data: {
            user: {
                id: "user-1",
                email: "user@example.com",
                hasPassword: true,
                googleId: null,
            },
        },
        status: "authenticated",
    }),
}));

vi.mock("next-themes", () => ({
    useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/actions/configuration", () => ({
    updateUserConfig: vi.fn(),
}));

vi.mock("@/lib/actions/auth-actions", () => ({
    requestPasswordSetup: vi.fn(),
}));

import SettingsForm from "@/components/dashboard/settings-form";

let container: HTMLDivElement;
let root: Root;

function render(ui: React.ReactElement) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
        root.render(ui);
    });
}

afterEach(() => {
    act(() => {
        root.unmount();
    });
    container.remove();
});

describe("SettingsForm — fecha de última actualización de contraseña", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Pin "now" so the relative date string is deterministic.
        vi.setSystemTime(new Date("2026-04-26T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renderiza 'Última actualización: ...' con la fecha relativa en español cuando hay hasPassword + passwordUpdatedAt", () => {
        // Three days before the pinned "now".
        const updatedAt = new Date("2026-04-23T12:00:00Z").toISOString();

        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "user@example.com",
                    hasPassword: true,
                    hasGoogle: false,
                    passwordUpdatedAt: updatedAt,
                },
            }),
        );

        const text = container.textContent ?? "";
        expect(text).toContain("Última actualización:");
        // date-fns formatDistanceToNow with locale `es` and addSuffix: true
        // produces phrases like "hace 3 días" — assert both pieces so we
        // know it's both Spanish AND relative.
        expect(text).toContain("hace");
        expect(text).toContain("días");
    });

    it("NO renderiza la línea 'Última actualización' cuando hasPassword es true pero passwordUpdatedAt es null", () => {
        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "user@example.com",
                    hasPassword: true,
                    hasGoogle: false,
                    passwordUpdatedAt: null,
                },
            }),
        );

        const text = container.textContent ?? "";
        expect(text).not.toContain("Última actualización:");
        // But the "ya tiene contraseña configurada" copy should still be there
        // so we know the hasPassword branch did render.
        expect(text).toContain("Tu cuenta ya tiene contraseña configurada");
    });

    it("NO renderiza la línea 'Última actualización' para una cuenta solo-Google sin password", () => {
        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "google@example.com",
                    hasPassword: false,
                    hasGoogle: true,
                    passwordUpdatedAt: null,
                },
            }),
        );

        const text = container.textContent ?? "";
        expect(text).not.toContain("Última actualización:");
        // We should be on the "agregá una contraseña" branch instead.
        expect(text).toContain("Hoy entrás solo con Google");
    });

    it("ignora passwordUpdatedAt cuando hasPassword es false (solo-Google)", () => {
        // Defensive: even if for some reason the server passes a stale
        // passwordUpdatedAt for a Google-only account, we must not show
        // the "Última actualización" line because the !hasPassword branch
        // doesn't render that block at all.
        const stalePasswordUpdatedAt = new Date("2026-04-23T12:00:00Z").toISOString();

        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "google@example.com",
                    hasPassword: false,
                    hasGoogle: true,
                    passwordUpdatedAt: stalePasswordUpdatedAt,
                },
            }),
        );

        const text = container.textContent ?? "";
        expect(text).not.toContain("Última actualización:");
    });
});
