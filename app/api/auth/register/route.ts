import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";

const registerSchema = z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    role: z.enum(["CLIENTE", "VENDEDOR", "INVERSOR", "DESARROLLADOR"]).optional().default("CLIENTE"),
});

import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    try {
        // Rate Limiting: Max 5 registrations per hour per IP
        const ip = getClientIp(req);
        const { allowed } = checkRateLimit(ip, {
            limit: 5,
            windowMs: 60 * 60 * 1000,
            keyPrefix: "register_"
        });

        if (!allowed) {
            return NextResponse.json(
                { error: "Demasiadas solicitudes de registro. Intente de nuevo en una hora." },
                { status: 429 }
            );
        }
        const body = await req.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }

        const { nombre, email, password, role: finalRole } = parsed.data;

        // Verificar si el email ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Este email ya está registrado" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Calcular fin de demo (48 horas desde ahora)
        const demoEndsAt = new Date();
        demoEndsAt.setHours(demoEndsAt.getHours() + 48);

        // Crear usuario con el rol especificado
        const user = await prisma.user.create({
            data: {
                nombre,
                email,
                password: hashedPassword,
                rol: finalRole,
                // Activar demo para desarrolladores y vendedores
                demoEndsAt: (finalRole === "VENDEDOR" || finalRole === "DESARROLLADOR") ? demoEndsAt : null,
                demoUsed: false,
            },
        });

        return NextResponse.json(
            {
                message: "Usuario creado exitosamente",
                userId: user.id
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error al registrar usuario:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
