import type {
  Client,
  DashboardPayload,
  MicrosoftIntegrationStatus,
  MicrosoftSyncResult,
  Technician,
  User,
  VisitOccurrence,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Error inesperado" }));
    throw new Error(payload.message || "Error inesperado");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: (token: string) => request<User>("/auth/me", { token }),
  dashboard: (token: string) => request<DashboardPayload>("/dashboard", { token }),
  clients: (token: string) => request<Client[]>("/clients", { token }),
  createClient: (token: string, payload: Omit<Client, "id">) =>
    request<Client>("/clients", {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  technicians: (token: string) => request<Technician[]>("/technicians", { token }),
  createTechnician: (
    token: string,
    payload: {
      name: string;
      email: string;
      password: string;
      phone?: string | null;
      zone?: string | null;
      specialty?: string | null;
    },
  ) =>
    request<Technician>("/technicians", {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTechnician: (
    token: string,
    technicianId: string,
    payload: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string | null;
      zone?: string | null;
      specialty?: string | null;
    },
  ) =>
    request<Technician>(`/technicians/${technicianId}`, {
      token,
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteTechnician: (token: string, technicianId: string) =>
    request<void>(`/technicians/${technicianId}`, {
      token,
      method: "DELETE",
    }),
  deleteTechnicianVisits: (token: string, technicianId: string) =>
    request<{ deletedVisits: number; technician: { id: string; name: string } }>(`/technicians/${technicianId}/visits`, {
      token,
      method: "DELETE",
    }),
  visits: (token: string, start: string, end: string) =>
    request<VisitOccurrence[]>(`/visits?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
      token,
    }),
  createVisit: (
    token: string,
    payload: {
      title: string;
      notes?: string;
      ticketNumber?: string | null;
      equipmentDiagnosis?: string | null;
      equipmentStatus?: string | null;
      startDateTime: string;
      durationMinutes: number;
      recurrence: string;
      clientId: string;
      technicianId: string;
    },
  ) =>
    request("/visits", {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateVisit: (
    token: string,
    visitId: string,
    payload: {
      clientId?: string;
      technicianId?: string;
      startDateTime?: string;
      durationMinutes?: number;
      title?: string;
      notes?: string;
      ticketNumber?: string | null;
      equipmentDiagnosis?: string | null;
      equipmentStatus?: string | null;
      recurrence?: string;
    },
  ) =>
    request(`/visits/${visitId}`, {
      token,
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteVisit: (token: string, visitId: string) =>
    request<void>(`/visits/${visitId}`, {
      token,
      method: "DELETE",
    }),
  microsoftStatus: (token: string) => request<MicrosoftIntegrationStatus>("/integrations/microsoft/status", { token }),
  microsoftConnect: (token: string) =>
    request<{ authUrl: string }>("/integrations/microsoft/connect", {
      token,
    }),
  microsoftSync: (
    token: string,
    payload: {
      technicianId: string;
      start: string;
      end: string;
    },
  ) =>
    request<MicrosoftSyncResult>("/integrations/microsoft/sync", {
      token,
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
