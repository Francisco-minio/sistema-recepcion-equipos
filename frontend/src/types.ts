export type Role = "ADMIN" | "TECHNICIAN";
export type Recurrence = "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  zone?: string | null;
  specialty?: string | null;
};

export type Client = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  notes?: string | null;
  _count?: {
    visits: number;
  };
};

export type Technician = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  zone?: string | null;
  specialty?: string | null;
  _count?: {
    assignedVisits: number;
  };
};

export type VisitOccurrence = {
  id: string;
  occurrenceStart: string;
  occurrenceEnd: string;
  title: string;
  notes?: string | null;
  ticketNumber?: string | null;
  equipmentDiagnosis?: string | null;
  equipmentStatus?: string | null;
  durationMinutes: number;
  recurrence: Recurrence;
  status: string;
  client: {
    id: string;
    name: string;
    email: string;
    contact: string;
  };
  technician: {
    id: string;
    name: string;
    zone?: string | null;
  };
};

export type DashboardPayload = {
  stats: {
    clients: number;
    technicians: number;
    recurringVisits: number;
  todayVisits: number;
  };
  upcomingVisits: VisitOccurrence[];
};

export type MicrosoftIntegrationStatus = {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  connectedBy:
    | {
        id: string;
        name: string;
        email: string;
      }
    | null;
  lastSyncAt: string | null;
};

export type MicrosoftSyncResult = {
  technician: {
    id: string;
    name: string;
    email: string;
  };
  imported: number;
  updated: number;
  totalEvents: number;
  range: {
    start: string;
    end: string;
  };
};
