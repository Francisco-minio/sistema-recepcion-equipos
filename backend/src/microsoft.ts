import jwt from "jsonwebtoken";
import { VisitStatus } from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./db.js";

type MicrosoftTokenResponse = {
  token_type: string;
  scope: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
  id_token?: string;
};

type MicrosoftAccount = {
  name?: string;
  email?: string;
};

type MicrosoftEvent = {
  id: string;
  subject?: string | null;
  start?: { dateTime?: string | null; timeZone?: string | null } | null;
  end?: { dateTime?: string | null; timeZone?: string | null } | null;
  iCalUId?: string | null;
  location?: { displayName?: string | null } | null;
  bodyPreview?: string | null;
  isCancelled?: boolean | null;
};

type MicrosoftCalendarResponse = {
  value: MicrosoftEvent[];
};

type MicrosoftCalendarListResponse = {
  value: Array<{
    id: string;
    name?: string | null;
    owner?: {
      name?: string | null;
      address?: string | null;
    } | null;
  }>;
};

type MicrosoftStatePayload = {
  userId: string;
  nonce: string;
};

const MICROSOFT_PROVIDER = "MICROSOFT";

function assertMicrosoftConfigured() {
  if (!config.microsoft.clientId || !config.microsoft.clientSecret || !config.microsoft.redirectUri) {
    throw new Error("La integracion con Microsoft 365 no esta configurada en el servidor");
  }
}

function getMicrosoftAuthorityUrl(path: string) {
  return `https://login.microsoftonline.com/${config.microsoft.tenantId}${path}`;
}

function buildGraphUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`https://graph.microsoft.com/v1.0${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, value);
  }
  return url;
}

function signMicrosoftState(payload: MicrosoftStatePayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "15m" });
}

function verifyMicrosoftState(state: string) {
  return jwt.verify(state, config.jwtSecret) as MicrosoftStatePayload;
}

async function exchangeMicrosoftToken(payload: Record<string, string>) {
  assertMicrosoftConfigured();
  const response = await fetch(getMicrosoftAuthorityUrl("/oauth2/v2.0/token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.microsoft.clientId,
      client_secret: config.microsoft.clientSecret,
      redirect_uri: config.microsoft.redirectUri,
      ...payload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No fue posible autorizar Microsoft 365: ${errorText.slice(0, 400)}`);
  }

  return (await response.json()) as MicrosoftTokenResponse;
}

async function decodeAccount(accessToken: string): Promise<MicrosoftAccount> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json()) as {
    displayName?: string;
    mail?: string | null;
    userPrincipalName?: string;
  };

  return {
    name: payload.displayName,
    email: payload.mail || payload.userPrincipalName,
  };
}

function createPlaceholderClientPayload(name: string) {
  const normalized = name.trim() || "Cliente Outlook";
  const slug = normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40) || "cliente";

  return {
    name: normalized,
    contact: "Sincronizado desde Outlook",
    email: `${slug}@pendiente.local`,
    phone: "Pendiente",
    address: "Pendiente",
    notes: "Creado automaticamente desde la integracion con Microsoft 365",
  };
}

function extractClientName(subject?: string | null) {
  const base = (subject || "Visita Outlook").trim();
  const withoutVisit = base.replace(/^visita\s+/i, "").trim();
  return withoutVisit || base || "Visita Outlook";
}

function extractTitle(subject?: string | null) {
  const cleanSubject = (subject || "").trim();
  if (!cleanSubject) return "Visita Outlook";
  return /^visita\s+/i.test(cleanSubject) ? "Visita técnica" : cleanSubject;
}

function eventDate(event: MicrosoftEvent, field: "start" | "end") {
  const rawValue = event[field]?.dateTime;
  if (!rawValue) {
    return null;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

async function getValidMicrosoftConnection() {
  const connection = await prisma.outlookConnection.findFirst({
    where: { provider: MICROSOFT_PROVIDER },
    orderBy: { updatedAt: "desc" },
  });

  if (!connection) {
    throw new Error("No hay una cuenta Microsoft 365 conectada");
  }

  const expiresSoon = connection.expiresAt.getTime() - Date.now() < 2 * 60 * 1000;
  if (!expiresSoon) {
    return connection;
  }

  const refreshed = await exchangeMicrosoftToken({
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
    scope: config.microsoft.scopes,
  });

  return prisma.outlookConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || connection.refreshToken,
      scope: refreshed.scope,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
}

async function graphGet<T>(accessToken: string, path: string, params?: Record<string, string>) {
  const response = await fetch(buildGraphUrl(path, params), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="Pacific SA Standard Time"',
    },
  });

  return response;
}

async function findSharedCalendarInMailbox(accessToken: string, ownerEmail: string) {
  const response = await graphGet<MicrosoftCalendarListResponse>(accessToken, "/me/calendars", {
    $select: "id,name,owner",
    $top: "200",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No fue posible listar calendarios compartidos: ${errorText.slice(0, 400)}`);
  }

  const payload = (await response.json()) as MicrosoftCalendarListResponse;
  const match = payload.value.find(
    (calendar) => calendar.owner?.address?.toLowerCase() === ownerEmail.toLowerCase(),
  );

  return match?.id || null;
}

async function fetchCalendarEvents(accessToken: string, ownerEmail: string, start: string, end: string) {
  const directResponse = await graphGet<MicrosoftCalendarResponse>(
    accessToken,
    `/users/${encodeURIComponent(ownerEmail)}/calendarView`,
    {
      startDateTime: start,
      endDateTime: end,
      $top: "200",
      $select: "id,subject,start,end,iCalUId,location,bodyPreview,isCancelled",
    },
  );

  if (directResponse.ok) {
    return (await directResponse.json()) as MicrosoftCalendarResponse;
  }

  const sharedCalendarId = await findSharedCalendarInMailbox(accessToken, ownerEmail);
  if (sharedCalendarId) {
    const sharedResponse = await graphGet<MicrosoftCalendarResponse>(
      accessToken,
      `/me/calendars/${encodeURIComponent(sharedCalendarId)}/calendarView`,
      {
        startDateTime: start,
        endDateTime: end,
        $top: "200",
        $select: "id,subject,start,end,iCalUId,location,bodyPreview,isCancelled",
      },
    );

    if (sharedResponse.ok) {
      return (await sharedResponse.json()) as MicrosoftCalendarResponse;
    }

    const sharedError = await sharedResponse.text();
    throw new Error(`No fue posible leer el calendario compartido de ${ownerEmail}: ${sharedError.slice(0, 400)}`);
  }

  const directError = await directResponse.text();
  throw new Error(
    `No se encontró un calendario compartido del técnico ${ownerEmail}. Verifica que ese calendario esté compartido contigo y agregado en Outlook. Detalle: ${directError.slice(0, 300)}`,
  );
}

export function getMicrosoftAuthUrl(userId: string) {
  assertMicrosoftConfigured();
  const state = signMicrosoftState({
    userId,
    nonce: crypto.randomUUID(),
  });

  const url = new URL(getMicrosoftAuthorityUrl("/oauth2/v2.0/authorize"));
  url.searchParams.set("client_id", config.microsoft.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.microsoft.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", config.microsoft.scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function connectMicrosoftAccount(code: string, state: string) {
  const payload = verifyMicrosoftState(state);
  const token = await exchangeMicrosoftToken({
    grant_type: "authorization_code",
    code,
    scope: config.microsoft.scopes,
  });

  const account = await decodeAccount(token.access_token);
  const accountEmail = account.email || `microsoft-${payload.userId}@local`;

  await prisma.outlookConnection.upsert({
    where: {
      provider_accountEmail: {
        provider: MICROSOFT_PROVIDER,
        accountEmail,
      },
    },
    update: {
      tenantId: config.microsoft.tenantId,
      accountName: account.name || accountEmail,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || "",
      scope: token.scope,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      connectedByUserId: payload.userId,
    },
    create: {
      provider: MICROSOFT_PROVIDER,
      tenantId: config.microsoft.tenantId,
      accountEmail,
      accountName: account.name || accountEmail,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || "",
      scope: token.scope,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      connectedByUserId: payload.userId,
    },
  });

  return accountEmail;
}

export async function getMicrosoftIntegrationStatus() {
  const connection = await prisma.outlookConnection.findFirst({
    where: { provider: MICROSOFT_PROVIDER },
    orderBy: { updatedAt: "desc" },
    include: {
      connectedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    configured: Boolean(config.microsoft.clientId && config.microsoft.clientSecret && config.microsoft.redirectUri),
    connected: Boolean(connection),
    accountEmail: connection?.accountEmail || null,
    accountName: connection?.accountName || null,
    connectedBy: connection?.connectedByUser || null,
    lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
  };
}

export async function syncMicrosoftTechnicianCalendar(input: {
  technicianId: string;
  start: string;
  end: string;
}) {
  const [connection, technician] = await Promise.all([
    getValidMicrosoftConnection(),
    prisma.user.findUnique({
      where: { id: input.technicianId },
    }),
  ]);

  if (!technician) {
    throw new Error("Tecnico no encontrado");
  }

  if (!technician.email) {
    throw new Error("El tecnico no tiene correo configurado para sincronizar");
  }

  const calendar = await fetchCalendarEvents(connection.accessToken, technician.email, input.start, input.end);
  const activeEventIds: string[] = [];
  let imported = 0;
  let updated = 0;

  for (const event of calendar.value) {
    const startDate = eventDate(event, "start");
    const endDate = eventDate(event, "end");
    if (!startDate || !endDate || !event.id) {
      continue;
    }

    activeEventIds.push(event.id);
    const durationMinutes = Math.max(30, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    const clientName = extractClientName(event.subject);
    const title = extractTitle(event.subject);
    const client = await prisma.client.findFirst({
      where: {
        name: {
          equals: clientName,
        },
      },
    });

    const ensuredClient =
      client ||
      (await prisma.client.create({
        data: createPlaceholderClientPayload(clientName),
      }));

    const notes = [event.location?.displayName, event.bodyPreview]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 1000);

    const existing = await prisma.visit.findUnique({
      where: { externalEventId: event.id },
    });

    const visitPayload = {
      title,
      notes: notes || null,
      startDateTime: startDate,
      durationMinutes,
      recurrence: "NONE" as const,
      status: event.isCancelled ? VisitStatus.CANCELLED : VisitStatus.SCHEDULED,
      clientId: ensuredClient.id,
      technicianId: technician.id,
      externalSource: MICROSOFT_PROVIDER,
      externalEventId: event.id,
      externalCalendarOwner: technician.email,
      externalICalUId: event.iCalUId || null,
    };

    if (existing) {
      await prisma.visit.update({
        where: { id: existing.id },
        data: visitPayload,
      });
      updated += 1;
    } else {
      await prisma.visit.create({
        data: visitPayload,
      });
      imported += 1;
    }
  }

  const startDate = new Date(input.start);
  const endDate = new Date(input.end);
  await prisma.visit.updateMany({
    where: {
      technicianId: technician.id,
      externalSource: MICROSOFT_PROVIDER,
      externalCalendarOwner: technician.email,
      startDateTime: {
        gte: startDate,
        lte: endDate,
      },
      externalEventId: {
        notIn: activeEventIds.length ? activeEventIds : ["__none__"],
      },
    },
    data: {
      status: VisitStatus.CANCELLED,
    },
  });

  await prisma.outlookConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date() },
  });

  return {
    technician: {
      id: technician.id,
      name: technician.name,
      email: technician.email,
    },
    imported,
    updated,
    totalEvents: activeEventIds.length,
    range: {
      start: input.start,
      end: input.end,
    },
  };
}
