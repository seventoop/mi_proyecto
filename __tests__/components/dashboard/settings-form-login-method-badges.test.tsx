// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";

// Mutable session state so each test can drive a different (googleId, hasPassword)
// combination through the same module-level mock.
type MockSessionUser = {
    id: string;
    email: string;
    googleId?: string | null;
    hasPassword?: boolean;
};

const sessionState: { user: MockSessionUser | null } = {
    user: {
        id: "user-1",
        email: "user@example.com",
        googleId: null,
        hasPassword: false,
    },
};

vi.mock("next-auth/react", () => ({
    useSession: () => ({
        data: sessionState.user ? { user: sessionState.user } : null,
        status: sessionState.user ? "authenticated" : "unauthenticated",
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

function setSessionUser(user: MockSessionUser | null) {
    sessionState.user = user;
}

afterEach(() => {
    act(() => {
        root.unmount();
    });
    container.remove();
    // Reset to a neutral default between tests so leakage is impossible.
    setSessionUser({
        id: "user-1",
        email: "user@example.com",
        googleId: null,
        hasPassword: false,
    });
});

function getGoogleBadge(): HTMLElement {
    const el = container.querySelector<HTMLElement>(
        '[data-testid="login-method-google-badge"]',
    );
    if (!el) throw new Error("login-method-google-badge not found");
    return el;
}

function getPasswordBadge(): HTMLElement {
    const el = container.querySelector<HTMLElement>(
        '[data-testid="login-method-password-badge"]',
    );
    if (!el) throw new Error("login-method-password-badge not found");
    return el;
}

describe("SettingsForm — badges de métodos de inicio de sesión", () => {
    it("muestra ambos badges en estado positivo cuando googleId y hasPassword están presentes", () => {
        setSessionUser({
            id: "user-1",
            email: "user@example.com",
            googleId: "google-sub-123",
            hasPassword: true,
        });

        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "user@example.com",
                    hasPassword: true,
                    hasGoogle: true,
                    passwordUpdatedAt: null,
                },
            }),
        );

        const google = getGoogleBadge();
        const password = getPasswordBadge();

        expect(google.textContent).toContain("Google vinculado: sí");
        expect(google.className).toContain("bg-emerald-500/10");
        expect(google.className).toContain("text-emerald-700");

        expect(password.textContent).toContain("Contraseña: configurada");
        expect(password.className).toContain("bg-emerald-500/10");
        expect(password.className).toContain("text-emerald-700");
    });

    it("muestra Google 'no' y Contraseña 'configurada' cuando solo hay password", () => {
        setSessionUser({
            id: "user-1",
            email: "user@example.com",
            googleId: null,
            hasPassword: true,
        });

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

        const google = getGoogleBadge();
        const password = getPasswordBadge();

        expect(google.textContent).toContain("Google vinculado: no");
        // negative-Google styling: slate, not emerald
        expect(google.className).toContain("bg-slate-100");
        expect(google.className).not.toContain("bg-emerald-500/10");

        expect(password.textContent).toContain("Contraseña: configurada");
        expect(password.className).toContain("bg-emerald-500/10");
    });

    it("muestra Google 'sí' y Contraseña 'no configurada' para una cuenta solo-Google", () => {
        setSessionUser({
            id: "user-1",
            email: "google@example.com",
            googleId: "google-sub-456",
            hasPassword: false,
        });

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

        const google = getGoogleBadge();
        const password = getPasswordBadge();

        expect(google.textContent).toContain("Google vinculado: sí");
        expect(google.className).toContain("bg-emerald-500/10");

        expect(password.textContent).toContain("Contraseña: no configurada");
        // negative-Password styling: amber, not emerald
        expect(password.className).toContain("bg-amber-500/10");
        expect(password.className).toContain("text-amber-700");
        expect(password.className).not.toContain("bg-emerald-500/10");
    });

    it("muestra ambos badges en negativo cuando no hay ni Google ni password", () => {
        setSessionUser({
            id: "user-1",
            email: "user@example.com",
            googleId: null,
            hasPassword: false,
        });

        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "user@example.com",
                    hasPassword: false,
                    hasGoogle: false,
                    passwordUpdatedAt: null,
                },
            }),
        );

        const google = getGoogleBadge();
        const password = getPasswordBadge();

        expect(google.textContent).toContain("Google vinculado: no");
        expect(google.className).toContain("bg-slate-100");

        expect(password.textContent).toContain("Contraseña: no configurada");
        expect(password.className).toContain("bg-amber-500/10");
    });

    it("usa el fallback a account.hasPassword cuando session.user.hasPassword es undefined (JWT viejo)", () => {
        // Simula un JWT minteado antes de que existieran googleId/hasPassword
        // en el token: la sesión devuelve un user sin esos campos.
        setSessionUser({
            id: "user-1",
            email: "user@example.com",
            // googleId y hasPassword undefined a propósito
        });

        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "user@example.com",
                    hasPassword: true,
                    hasGoogle: true,
                    passwordUpdatedAt: null,
                },
            }),
        );

        const google = getGoogleBadge();
        const password = getPasswordBadge();

        // El fallback debe leer de `account` cuando la sesión no trae los
        // campos nuevos. Si esto rompe, los badges se mostrarían en falso
        // negativo justo después de un deploy y antes de que el JWT rote.
        expect(google.textContent).toContain("Google vinculado: sí");
        expect(google.className).toContain("bg-emerald-500/10");

        expect(password.textContent).toContain("Contraseña: configurada");
        expect(password.className).toContain("bg-emerald-500/10");
    });

    it("oculta el botón 'Agregar contraseña a mi cuenta' cuando ya hay contraseña, en paralelo con el badge 'Contraseña: configurada'", () => {
        setSessionUser({
            id: "user-1",
            email: "user@example.com",
            googleId: "google-sub-789",
            hasPassword: true,
        });

        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: {
                    email: "user@example.com",
                    hasPassword: true,
                    hasGoogle: true,
                    passwordUpdatedAt: null,
                },
            }),
        );

        // Badge en estado "configurada"
        const password = getPasswordBadge();
        expect(password.textContent).toContain("Contraseña: configurada");

        // Botón ausente
        const buttons = Array.from(container.querySelectorAll("button"));
        const addPasswordButton = buttons.find((b) =>
            (b.textContent ?? "").includes("Agregar contraseña a mi cuenta"),
        );
        expect(addPasswordButton).toBeUndefined();
    });

    it("muestra el botón 'Agregar contraseña a mi cuenta' cuando NO hay contraseña pero sí Google (control positivo del caso anterior)", () => {
        setSessionUser({
            id: "user-1",
            email: "google@example.com",
            googleId: "google-sub-789",
            hasPassword: false,
        });

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

        // Badge en estado "no configurada"
        const password = getPasswordBadge();
        expect(password.textContent).toContain("Contraseña: no configurada");

        // Botón presente
        const buttons = Array.from(container.querySelectorAll("button"));
        const addPasswordButton = buttons.find((b) =>
            (b.textContent ?? "").includes("Agregar contraseña a mi cuenta"),
        );
        expect(addPasswordButton).toBeDefined();
    });
});
