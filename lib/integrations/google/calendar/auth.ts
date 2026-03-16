import { google } from "googleapis";
import { db } from "@/lib/db";
import { CalendarConfig } from "./types";

/**
 * Creates a Google OAuth2 client for a specific organization.
 * Handles token fetching and automatic refresh if needed.
 */
export async function getGoogleAuthClient(orgId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const integration = await db.integrationConfig.findUnique({
    where: { orgId_provider: { orgId, provider: "GOOGLE_CALENDAR" } }
  });

  if (!integration || !integration.config) {
    throw new Error("Google Calendar integration not configured for this organization.");
  }

  const config = integration.config as unknown as CalendarConfig;

  if (!config.refreshToken) {
    throw new Error("Missing refresh token in Google Calendar configuration.");
  }

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken
  });

  // Attach listener to update tokens in DB if they are refreshed automatically
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      // Update persistent storage with new tokens
      await db.integrationConfig.update({
        where: { id: integration.id },
        data: {
          config: {
            ...config,
            refreshToken: tokens.refresh_token
          }
        }
      });
    }
  });

  return oauth2Client;
}
