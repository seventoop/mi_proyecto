export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: string;
  }[];
  htmlLink?: string;
  hangoutLink?: string; // Meet link
}

export interface GoogleCalendarAvailability {
  start: string;
  end: string;
  busy: {
    start: string;
    end: string;
  }[];
}

export interface CalendarConfig {
  refreshToken: string;
  calendarId?: string;
  lastSync?: string;
}
