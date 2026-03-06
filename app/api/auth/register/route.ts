import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  // SECURITY: do not allow role selection from public registration
  role: z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting: Max 5 registrations per hour per IP
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(ip, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
      keyPrefix: "register_",
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

    const { nombre, email, password } = parsed.data;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // SECURITY: public registration always creates CLIENTE
    const finalRole = "CLIENTE";

    const user = await prisma.user.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: finalRole,
        kycStatus: "NINGUNO",
        demoEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        demoUsed: false,
      },
    });

    return NextResponse.json(
      {
        message: "Usuario creado exitosamente",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}