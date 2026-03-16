import { NodeDefinition } from "../types";
import { GoogleCalendarClient } from "../../../integrations/google/calendar/client";
import { db } from "@/lib/db";

/**
 * GOOGLE_CALENDAR_CREATE_EVENT Node
 */
export const googleCalendarCreateEventNode: NodeDefinition = {
  type: "GOOGLE_CALENDAR_CREATE_EVENT",
  label: "Google Calendar: Crear Evento",
  category: "Integrations",
  icon: "calendar",
  description: "Crea un evento en Google Calendar.",
  configSchema: [
    { id: "summary", label: "Título del Evento", type: "text", required: true },
    { id: "description", label: "Descripción", type: "textarea" },
    { id: "location", label: "Ubicación", type: "text" },
    { id: "startTime", label: "Fecha/Hora Inicio (ISO)", type: "text", placeholder: "{{payload.date}}T10:00:00Z" },
    { id: "durationMinutes", label: "Duración (minutos)", type: "number", defaultValue: 30 },
    { id: "useMeet", label: "Crear link de Google Meet", type: "checkbox", defaultValue: true }
  ],
  handler: async (config, payload, orgId) => {
    const client = new GoogleCalendarClient(orgId);
    
    // Evaluate dynamic fields from payload if needed (simplified for now)
    const summary = config.summary;
    const description = config.description;
    const startTime = config.startTime || new Date().toISOString();
    const duration = Number(config.durationMinutes) || 30;
    
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    const event = await client.createEvent({
      summary,
      description,
      location: config.location,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() }
    });

    return {
      success: true,
      eventId: event.id,
      htmlLink: event.htmlLink,
      meetLink: event.hangoutLink
    };
  }
};

/**
 * GOOGLE_CALENDAR_LIST_AVAILABILITY Node
 */
export const googleCalendarListAvailabilityNode: NodeDefinition = {
  type: "GOOGLE_CALENDAR_LIST_AVAILABILITY",
  label: "Google Calendar: Disponibilidad",
  category: "Integrations",
  icon: "clock",
  description: "Consulta huecos ocupados en el calendario.",
  configSchema: [
    { id: "timeMin", label: "Fecha Inicio (ISO)", type: "text" },
    { id: "timeMax", label: "Fecha Fin (ISO)", type: "text" }
  ],
  handler: async (config, payload, orgId) => {
    const client = new GoogleCalendarClient(orgId);
    const timeMin = config.timeMin || new Date().toISOString();
    const timeMax = config.timeMax || new Date(Date.now() + 86400000).toISOString();

    const availability = await client.listAvailability(timeMin, timeMax);

    return {
      success: true,
      availability: availability[0]?.busy || []
    };
  }
};

/**
 * GOOGLE_CALENDAR_UPDATE_EVENT Node
 */
export const googleCalendarUpdateEventNode: NodeDefinition = {
  type: "GOOGLE_CALENDAR_UPDATE_EVENT",
  label: "Google Calendar: Actualizar",
  category: "Integrations",
  icon: "edit",
  description: "Actualiza un evento existente.",
  configSchema: [
    { id: "eventId", label: "ID del Evento", type: "text", required: true },
    { id: "summary", label: "Nuevo Título", type: "text" }
  ],
  handler: async (config, payload, orgId) => {
    const client = new GoogleCalendarClient(orgId);
    const eventId = config.eventId;

    if (!eventId) throw new Error("Event ID is required");

    const event = await client.updateEvent(eventId, {
      summary: config.summary
    });

    return {
      success: true,
      eventId: event.id
    };
  }
};

/**
 * GOOGLE_CALENDAR_GET_EVENT Node
 */
export const googleCalendarGetEventNode: NodeDefinition = {
  type: "GOOGLE_CALENDAR_GET_EVENT",
  label: "Google Calendar: Obtener",
  category: "Integrations",
  icon: "info",
  description: "Obtiene los detalles de un evento.",
  configSchema: [
    { id: "eventId", label: "ID del Evento", type: "text", required: true }
  ],
  handler: async (config, payload, orgId) => {
    const client = new GoogleCalendarClient(orgId);
    const eventId = config.eventId;

    if (!eventId) throw new Error("Event ID is required");

    const event = await client.getEvent(eventId);

    return {
      success: true,
      event
    };
  }
};
