import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

import {
    createGooglePreRegistrationToken,
    verifyGooglePreRegistrationToken,
} from "@/lib/auth/google-pre-registration";

const TEST_SECRET = "test-nextauth-secret-for-google-pre-reg";

function encodeBase64Url(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(encodedPayload: string, secret: string) {
    return crypto
        .createHmac("sha256", secret)
        .update(encodedPayload)
        .digest("base64url");
}

describe("verifyGooglePreRegistrationToken", () => {
    const originalSecret = process.env.NEXTAUTH_SECRET;

    beforeEach(() => {
        process.env.NEXTAUTH_SECRET = TEST_SECRET;
    });

    afterEach(() => {
        vi.useRealTimers();
        if (originalSecret === undefined) {
            delete process.env.NEXTAUTH_SECRET;
        } else {
            process.env.NEXTAUTH_SECRET = originalSecret;
        }
    });

    it("devuelve el payload original cuando el token está bien formado y vigente", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        const token = createGooglePreRegistrationToken({
            email: "nuevo@example.com",
            googleSub: "google-sub-123",
            fullName: "Nuevo Usuario",
            picture: "https://lh3.googleusercontent.com/avatar.png",
        });

        const payload = verifyGooglePreRegistrationToken(token);

        expect(payload.email).toBe("nuevo@example.com");
        expect(payload.googleSub).toBe("google-sub-123");
        expect(payload.fullName).toBe("Nuevo Usuario");
        expect(payload.picture).toBe("https://lh3.googleusercontent.com/avatar.png");
        expect(payload.exp).toBe(Date.now() + 10 * 60 * 1000);
    });

    it("lanza INVALID_GOOGLE_PRE_REG_TOKEN cuando la firma fue alterada", () => {
        const token = createGooglePreRegistrationToken({
            email: "nuevo@example.com",
            googleSub: "google-sub-123",
            fullName: "Nuevo Usuario",
            picture: null,
        });

        const [encodedPayload, signature] = token.split(".");
        const tamperedSignature =
            signature.slice(0, -1) + (signature.slice(-1) === "A" ? "B" : "A");
        const tamperedToken = `${encodedPayload}.${tamperedSignature}`;

        expect(() => verifyGooglePreRegistrationToken(tamperedToken)).toThrow(
            "INVALID_GOOGLE_PRE_REG_TOKEN",
        );
    });

    it("lanza INVALID_GOOGLE_PRE_REG_TOKEN cuando el payload fue alterado (firma deja de coincidir)", () => {
        const token = createGooglePreRegistrationToken({
            email: "nuevo@example.com",
            googleSub: "google-sub-123",
            fullName: "Nuevo Usuario",
            picture: null,
        });

        const [, signature] = token.split(".");
        const forgedPayload = encodeBase64Url(
            JSON.stringify({
                email: "atacante@example.com",
                googleSub: "google-sub-123",
                fullName: "Atacante",
                picture: null,
                exp: Date.now() + 10 * 60 * 1000,
            }),
        );
        const forgedToken = `${forgedPayload}.${signature}`;

        expect(() => verifyGooglePreRegistrationToken(forgedToken)).toThrow(
            "INVALID_GOOGLE_PRE_REG_TOKEN",
        );
    });

    it("lanza INVALID_GOOGLE_PRE_REG_TOKEN cuando el token no tiene punto separador", () => {
        expect(() => verifyGooglePreRegistrationToken("token-sin-punto")).toThrow(
            "INVALID_GOOGLE_PRE_REG_TOKEN",
        );
    });

    it("lanza INVALID_GOOGLE_PRE_REG_TOKEN cuando el token está vacío", () => {
        expect(() => verifyGooglePreRegistrationToken("")).toThrow(
            "INVALID_GOOGLE_PRE_REG_TOKEN",
        );
    });

    it("lanza INVALID_GOOGLE_PRE_REG_TOKEN cuando falta la parte de la firma", () => {
        const encodedPayload = encodeBase64Url(
            JSON.stringify({
                email: "nuevo@example.com",
                googleSub: "google-sub-123",
                fullName: "Nuevo Usuario",
                picture: null,
                exp: Date.now() + 10 * 60 * 1000,
            }),
        );

        expect(() => verifyGooglePreRegistrationToken(`${encodedPayload}.`)).toThrow(
            "INVALID_GOOGLE_PRE_REG_TOKEN",
        );
    });

    it.each([
        {
            label: "email",
            payload: {
                googleSub: "google-sub-123",
                fullName: "Nuevo Usuario",
                picture: null,
                exp: Date.now() + 10 * 60 * 1000,
            },
        },
        {
            label: "googleSub",
            payload: {
                email: "nuevo@example.com",
                fullName: "Nuevo Usuario",
                picture: null,
                exp: Date.now() + 10 * 60 * 1000,
            },
        },
        {
            label: "fullName",
            payload: {
                email: "nuevo@example.com",
                googleSub: "google-sub-123",
                picture: null,
                exp: Date.now() + 10 * 60 * 1000,
            },
        },
        {
            label: "exp",
            payload: {
                email: "nuevo@example.com",
                googleSub: "google-sub-123",
                fullName: "Nuevo Usuario",
                picture: null,
            },
        },
    ])(
        "lanza INVALID_GOOGLE_PRE_REG_TOKEN cuando falta el campo $label",
        ({ payload }) => {
            const encodedPayload = encodeBase64Url(JSON.stringify(payload));
            const signature = signPayload(encodedPayload, TEST_SECRET);
            const token = `${encodedPayload}.${signature}`;

            expect(() => verifyGooglePreRegistrationToken(token)).toThrow(
                "INVALID_GOOGLE_PRE_REG_TOKEN",
            );
        },
    );

    it("lanza EXPIRED_GOOGLE_PRE_REG_TOKEN cuando exp < Date.now()", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        const token = createGooglePreRegistrationToken({
            email: "nuevo@example.com",
            googleSub: "google-sub-123",
            fullName: "Nuevo Usuario",
            picture: null,
        });

        // Avanzamos el reloj más allá del TTL de 10 minutos.
        vi.setSystemTime(new Date("2026-01-01T00:11:00Z"));

        expect(() => verifyGooglePreRegistrationToken(token)).toThrow(
            "EXPIRED_GOOGLE_PRE_REG_TOKEN",
        );
    });
});
