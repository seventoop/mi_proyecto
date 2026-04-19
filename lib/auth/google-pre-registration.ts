import crypto from "crypto";

const GOOGLE_PRE_REG_ALLOWED_ROLES = [
    "CLIENTE",
    "INVERSOR",
    "VENDEDOR",
    "DESARROLLADOR",
] as const;

const GOOGLE_PRE_REG_TTL_MS = 10 * 60 * 1000;

export type GooglePreRegistrationRole = (typeof GOOGLE_PRE_REG_ALLOWED_ROLES)[number];

type GooglePreRegistrationPayload = {
    email: string;
    googleSub: string;
    fullName: string;
    picture: string | null;
    exp: number;
};

function getSecret() {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error("NEXTAUTH_SECRET is required for Google pre-registration flow");
    }
    return secret;
}

function encodeBase64Url(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string) {
    return crypto
        .createHmac("sha256", getSecret())
        .update(encodedPayload)
        .digest("base64url");
}

export function getPublicGoogleRegistrationRoles(): GooglePreRegistrationRole[] {
    return [...GOOGLE_PRE_REG_ALLOWED_ROLES];
}

export function isAllowedGoogleRegistrationRole(role: string): role is GooglePreRegistrationRole {
    return GOOGLE_PRE_REG_ALLOWED_ROLES.includes(role as GooglePreRegistrationRole);
}

export function createGooglePreRegistrationToken(input: Omit<GooglePreRegistrationPayload, "exp">) {
    const payload: GooglePreRegistrationPayload = {
        ...input,
        exp: Date.now() + GOOGLE_PRE_REG_TTL_MS,
    };

    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = signPayload(encodedPayload);
    return `${encodedPayload}.${signature}`;
}

export function verifyGooglePreRegistrationToken(token: string): GooglePreRegistrationPayload {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
        throw new Error("INVALID_GOOGLE_PRE_REG_TOKEN");
    }

    const expectedSignature = signPayload(encodedPayload);
    const provided = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        throw new Error("INVALID_GOOGLE_PRE_REG_TOKEN");
    }

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as GooglePreRegistrationPayload;

    if (!payload.email || !payload.googleSub || !payload.fullName || !("exp" in payload)) {
        throw new Error("INVALID_GOOGLE_PRE_REG_TOKEN");
    }

    if (payload.exp < Date.now()) {
        throw new Error("EXPIRED_GOOGLE_PRE_REG_TOKEN");
    }

    return payload;
}
