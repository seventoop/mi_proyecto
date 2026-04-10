import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
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
  // @security-waive: PUBLIC - open registration handler
  try {
    // Rate Limiting: Max 5 registrations per hour per IP
    const ip = getClientIp(req);
    const { allowed } = await checkRateLimit(ip, {
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

    const { nombre, password, role } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();

    // SECURITY: Whitelist of allowed roles from public registration
    const ALLOWED_ROLES = ["DESARROLLADOR", "VENDEDOR", "INVERSOR"];
    const BLOCKED_ROLES = ["ADMIN", "SUPERADMIN"];

    if (BLOCKED_ROLES.includes(role?.toUpperCase())) {
      return NextResponse.json(
        { error: "Acceso denegado. No se permiten registros administrativos." },
        { status: 403 }
      );
    }

    // Default to CLIENTE if role is not in whitelist or not provided
    const finalRole = ALLOWED_ROLES.includes(role?.toUpperCase())
      ? role.toUpperCase()
      : "CLIENTE";

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

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

    // Centralized Forensic Audit
    const { audit } = await import("@/lib/actions/audit");
    await audit({
        userId: user.id,
        action: "AUTH_REGISTER_SUCCESS",
        entity: "User",
        entityId: user.id,
        details: { role: finalRole, email: user.email }
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