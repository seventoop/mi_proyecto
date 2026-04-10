"use server";

interface DemoProjectWriter {
    proyecto: {
        updateMany(args: {
            where: { creadoPorId: string; isDemo: boolean };
            data: { isDemo: false; demoExpiresAt: null };
        }): Promise<unknown>;
    };
}

/**
 * Shared helper used by both KYC flows.
 * Keeps the current business rule intact: once a developer is approved,
 * demo projects become real projects.
 */
export async function clearDeveloperDemoProjects(
    client: DemoProjectWriter,
    userId: string,
) {
    await client.proyecto.updateMany({
        where: { creadoPorId: userId, isDemo: true },
        data: { isDemo: false, demoExpiresAt: null },
    });
}
