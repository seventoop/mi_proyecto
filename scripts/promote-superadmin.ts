/**
 * Promotes a single user to SUPERADMIN.
 *
 * - Idempotente: si ya es SUPERADMIN no hace nada.
 * - dry-run por defecto. Para escribir: pasar --apply.
 * - NO toca password, googleId, email, nombre ni ningún otro campo.
 * - NO borra nada.
 * - NO toca a otros usuarios.
 *
 * Uso:
 *   npm run promote:superadmin:dry-run -- --email <email>
 *   npm run promote:superadmin:apply  -- --email <email>
 */

import { PrismaClient } from "@prisma/client";

function getArg(name: string): string | undefined {
    const flag = `--${name}`;
    const idx = process.argv.indexOf(flag);
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
    const inline = process.argv.find((a) => a.startsWith(`${flag}=`));
    if (inline) return inline.split("=").slice(1).join("=");
    return undefined;
}

function isApply(): boolean {
    return process.argv.includes("--apply") || process.env.APPLY === "true";
}

function maskUrl(url: string | undefined): string {
    if (!url) return "(no DATABASE_URL)";
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.username ? "***@" : ""}${u.hostname}:${u.port || "?"}${u.pathname}`;
    } catch {
        return "(invalid url)";
    }
}

async function main() {
    const apply = isApply();
    const emailArg = getArg("email");

    if (!emailArg) {
        console.error("ERROR: falta --email. Ejemplo: --email user@example.com");
        process.exit(1);
    }

    const email = emailArg.trim().toLowerCase();
    const dbUrl = process.env.DATABASE_URL;

    console.log("─────────────────────────────────────────────");
    console.log(" SevenToop · promote-superadmin");
    console.log(" mode :", apply ? "APPLY (escribirá en DB)" : "DRY-RUN (no escribe)");
    console.log(" db   :", maskUrl(dbUrl));
    console.log(" email:", email);
    console.log("─────────────────────────────────────────────");

    if (!dbUrl) {
        console.error("ERROR: DATABASE_URL no está definido. Abortando.");
        process.exit(1);
    }

    const prisma = new PrismaClient();
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                rol: true,
                nombre: true,
                googleId: true,
                createdAt: true,
                password: true,
            },
        });

        if (!user) {
            console.error(`ERROR: no se encontró ningún usuario con email=${email}`);
            process.exit(1);
        }

        const before = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            hasPassword: Boolean(user.password),
            hasGoogle: Boolean(user.googleId),
            createdAt: user.createdAt,
        };

        console.log("ANTES:");
        console.log(JSON.stringify(before, null, 2));

        if (user.rol === "SUPERADMIN") {
            console.log("Ya es SUPERADMIN. No hay nada que cambiar.");
            return;
        }

        console.log(`PLAN: cambiar rol de "${user.rol}" → "SUPERADMIN"`);
        console.log("Campos que NO se tocan: password, googleId, email, nombre, createdAt.");

        if (!apply) {
            console.log("DRY-RUN: nada se escribió. Para aplicar: --apply.");
            return;
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { rol: "SUPERADMIN" },
            select: {
                id: true,
                email: true,
                rol: true,
                nombre: true,
                googleId: true,
                createdAt: true,
                password: true,
            },
        });

        const after = {
            id: updated.id,
            email: updated.email,
            nombre: updated.nombre,
            rol: updated.rol,
            hasPassword: Boolean(updated.password),
            hasGoogle: Boolean(updated.googleId),
            createdAt: updated.createdAt,
        };

        console.log("DESPUÉS:");
        console.log(JSON.stringify(after, null, 2));

        try {
            await prisma.auditLog.create({
                data: {
                    userId: updated.id,
                    action: "USER_ROLE_PROMOTED_SUPERADMIN",
                    entity: "User",
                    entityId: updated.id,
                    details: JSON.stringify({
                        from: user.rol,
                        to: "SUPERADMIN",
                        source: "scripts/promote-superadmin.ts",
                    }),
                },
            });
            console.log("AuditLog registrado.");
        } catch (auditErr) {
            console.error("AuditLog falló (no crítico):", auditErr);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("promote-superadmin failed:", err);
    process.exit(1);
});
