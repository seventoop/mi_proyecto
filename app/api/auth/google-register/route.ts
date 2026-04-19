import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getInitialUserRole } from "@/lib/auth/registration-policy";
import {
    isAllowedGoogleRegistrationRole,
    verifyGooglePreRegistrationToken,
} from "@/lib/auth/google-pre-registration";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const token = typeof body?.token === "string" ? body.token : "";
        const selectedRole = typeof body?.role === "string" ? body.role.toUpperCase().trim() : "";

        if (!token) {
            return NextResponse.json({ error: "Token inválido" }, { status: 400 });
        }

        if (!isAllowedGoogleRegistrationRole(selectedRole)) {
            return NextResponse.json({ error: "Rol no permitido para auto-registro" }, { status: 400 });
        }

        const payload = verifyGooglePreRegistrationToken(token);

        const existingUser = await prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json({ success: true, alreadyExists: true });
        }

        const finalRole = getInitialUserRole(selectedRole);

        const user = await prisma.user.create({
            data: {
                email: payload.email,
                googleId: payload.googleSub,
                nombre: payload.fullName,
                avatar: payload.picture,
                rol: finalRole,
                kycStatus: "NINGUNO",
                demoEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                demoUsed: false,
            },
        });

        const { audit } = await import("@/lib/actions/audit");
        await audit({
            userId: user.id,
            action: "AUTH_REGISTER_SUCCESS",
            entity: "User",
            entityId: user.id,
            details: {
                method: "GOOGLE",
                requestedRole: selectedRole,
                finalRole,
                email: user.email,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

        if (message === "INVALID_GOOGLE_PRE_REG_TOKEN" || message === "EXPIRED_GOOGLE_PRE_REG_TOKEN") {
            return NextResponse.json({ error: "La sesión de Google expiró. Volvé a intentarlo." }, { status: 400 });
        }

        console.error("Error creating Google pre-registered user:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
