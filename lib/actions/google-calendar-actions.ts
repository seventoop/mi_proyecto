"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAnyRole, handleGuardError } from "@/lib/guards";
import { z } from "zod";

const configSchema = z.object({
  refreshToken: z.string().min(1),
  calendarId: z.string().optional(),
});

/**
 * Updates or creates the Google Calendar integration for an organization.
 */
export async function updateGoogleCalendarConfig(orgId: string, config: any) {
  try {
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);
    
    // RBAC/Multi-tenant check: Admin can update any, but usually they update their own org unless they are SuperAdmin
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) {
      throw new Error("No tienes permisos para configurar esta organización.");
    }

    const validated = configSchema.parse(config);

    await (db as any).integrationConfig.upsert({
      where: { orgId_provider: { orgId, provider: "GOOGLE_CALENDAR" } },
      update: {
        status: "ACTIVE",
        config: validated as any
      },
      create: {
        orgId,
        provider: "GOOGLE_CALENDAR",
        status: "ACTIVE",
        config: validated as any
      }
    });

    revalidatePath("/dashboard/admin/logictoop/integrations");
    return { success: true };
  } catch (error) {
    return handleGuardError(error);
  }
}

/**
 * Disconnects Google Calendar from an organization.
 */
export async function disconnectGoogleCalendar(orgId: string) {
  try {
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) {
      throw new Error("No tienes permisos para esta organización.");
    }

    await (db as any).integrationConfig.delete({
      where: { orgId_provider: { orgId, provider: "GOOGLE_CALENDAR" } }
    });

    revalidatePath("/dashboard/admin/logictoop/integrations");
    return { success: true };
  } catch (error) {
    return handleGuardError(error);
  }
}

/**
 * Gets the current configuration for an organization.
 */
export async function getGoogleCalendarConfig(orgId: string) {
  try {
    const integration = await (db as any).integrationConfig.findUnique({
      where: { orgId_provider: { orgId, provider: "GOOGLE_CALENDAR" } }
    });

    return { 
      success: true, 
      data: integration ? {
        status: integration.status,
        calendarId: (integration.config as any)?.calendarId || "primary",
        hasRefreshToken: !!(integration.config as any)?.refreshToken
      } : null 
    };
  } catch (error) {
    return handleGuardError(error);
  }
}
