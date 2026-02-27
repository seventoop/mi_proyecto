import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
    try {
        const { nombre, email, password, role } = await req.json();

        // Validaciones
        if (!nombre || !email || !password) {
            return NextResponse.json(
                { error: "Todos los campos son requeridos" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 8 caracteres" },
                { status: 400 }
            );
        }

        const allowedRoles = ["CLIENTE", "VENDEDOR", "INVERSOR", "DESARROLLADOR"];
        const finalRole = allowedRoles.includes(role) ? role : "CLIENTE";

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
