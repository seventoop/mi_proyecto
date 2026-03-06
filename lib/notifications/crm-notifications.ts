import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/mail";

export async function notifyLeadAssigned(lead: any, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) return;

    await sendTransactionalEmail({
        to: user.email,
        subject: `Nuevo Lead Asignado: ${lead.nombre}`,
        text: `Se te ha asignado un nuevo lead: ${lead.nombre}. Origen: ${lead.canalOrigen || lead.origen}`,
        html: `
            <h1>Nuevo Lead Asignado</h1>
            <p>Se te ha asignado un nuevo lead: <strong>${lead.nombre}</strong></p>
            <p>Origen: ${lead.canalOrigen || lead.origen}</p>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/leads">Ver en el Panel</a>
        `
    });
}

export async function notifyInactiveLead(lead: any, orgId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { users: { where: { rol: 'DESARROLLADOR' } } }
    });

    if (!org) return;

    const emails = org.users.map(u => u.email).filter(Boolean) as string[];
    if (emails.length === 0) return;

    for (const email of emails) {
        await sendTransactionalEmail({
            to: email,
            subject: `ALERTA: Lead Inactivo - ${lead.nombre}`,
            text: `El lead ${lead.nombre} lleva más de 48 horas sin actualizaciones.`,
            html: `
                <h1>Lead sin actividad detectada</h1>
                <p>El lead <strong>${lead.nombre}</strong> lleva más de 48 horas sin actualizaciones.</p>
                <p>Estado actual: ${lead.estado}</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/leads">Contactar ahora</a>
            `
        });
    }
}
