// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
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

describe("SettingsForm — rama defensiva cuando account es null", () => {
    it("muestra el mensaje de error y oculta el botón 'Agregar contraseña' y la 'Última actualización'", () => {
        render(
            React.createElement(SettingsForm, {
                initialConfig: {},
                account: null,
            }),
        );

        const text = container.textContent ?? "";

        // 1) The defensive error copy is shown.
        expect(text).toContain("No pudimos cargar el estado de tu cuenta.");

        // 2) The "Agregar contraseña" CTA must NOT render — the button is
        //    only emitted when `account` is truthy AND the user is in the
        //    Google-only / no-password state.
        expect(text).not.toContain("Agregar contraseña a mi cuenta");
        const buttons = Array.from(container.querySelectorAll("button"));
        const hasAddPasswordButton = buttons.some((b) =>
            (b.textContent ?? "").includes("Agregar contraseña a mi cuenta"),
        );
        expect(hasAddPasswordButton).toBe(false);

        // 3) The "Última actualización" line must NOT render — it lives
        //    inside the `account ? ...` branch and would crash if rendered
        //    against a null account.
        expect(text).not.toContain("Última actualización");
    });
});
