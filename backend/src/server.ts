import cors from "cors";
import express from "express";
import dayjs from "dayjs";
import { Role } from "@prisma/client";
import { hashPassword, requireAuth, requireRole, signToken, verifyPassword } from "./auth.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import {
  connectMicrosoftAccount,
  getMicrosoftAuthUrl,
  getMicrosoftIntegrationStatus,
  syncMicrosoftTechnicianCalendar,
} from "./microsoft.js";
import { expandVisits } from "./schedule.js";
import {
  clientSchema,
  loginSchema,
  microsoftSyncSchema,
  technicianSchema,
  technicianUpdateSchema,
  visitSchema,
  visitUpdateSchema,
} from "./validators.js";

const app = express();

function normalizeNullableText(value: string | null | undefined) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

app.use(
  cors({
    origin: config.frontendUrl,
  }),
);
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/auth/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Credenciales invalidas" });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return response.status(401).json({ message: "Credenciales invalidas" });
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValid) {
    return response.status(401).json({ message: "Credenciales invalidas" });
  }

  const authUser = { id: user.id, email: user.email, role: user.role };
  response.json({
    token: signToken(authUser),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      zone: user.zone,
      specialty: user.specialty,
    },
  });
});

app.get("/auth/me", requireAuth, async (request, response) => {
  if (!request.user) {
    return response.status(401).json({ message: "No autorizado" });
  }
  const user = await prisma.user.findUnique({ where: { id: request.user.id } });
  if (!user) {
    return response.status(404).json({ message: "Usuario no encontrado" });
  }

  response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    zone: user.zone,
    specialty: user.specialty,
  });
});

app.get("/integrations/microsoft/callback", async (request, response) => {
  const code = typeof request.query.code === "string" ? request.query.code : "";
  const state = typeof request.query.state === "string" ? request.query.state : "";
  const error = typeof request.query.error === "string" ? request.query.error : "";

  if (error) {
    return response
      .status(400)
      .type("html")
      .send(
        `<html><body style="font-family: sans-serif; background: #0f172a; color: white; padding: 32px;">
          <h1>No se pudo conectar Microsoft 365</h1>
          <p>${error}</p>
          <p><a style="color:#34d399" href="${config.frontendUrl}">Volver al sistema</a></p>
        </body></html>`,
      );
  }

  if (!code || !state) {
    return response.status(400).send("Callback de Microsoft invalido");
  }

  try {
    await connectMicrosoftAccount(code, state);
    return response
      .status(200)
      .type("html")
      .send(
        `<html><body style="font-family: sans-serif; background: #0f172a; color: white; padding: 32px;">
          <h1>Microsoft 365 conectado</h1>
          <p>La cuenta fue vinculada correctamente.</p>
          <script>setTimeout(() => { window.location.href = ${JSON.stringify(config.frontendUrl)}; }, 1500);</script>
          <p><a style="color:#34d399" href="${config.frontendUrl}">Volver ahora</a></p>
        </body></html>`,
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return response
      .status(500)
      .type("html")
      .send(
        `<html><body style="font-family: sans-serif; background: #0f172a; color: white; padding: 32px;">
          <h1>Error al conectar Microsoft 365</h1>
          <p>${message}</p>
          <p><a style="color:#34d399" href="${config.frontendUrl}">Volver al sistema</a></p>
        </body></html>`,
      );
  }
});

app.get("/dashboard", requireAuth, async (request, response) => {
  if (!request.user) {
    return response.status(401).json({ message: "No autorizado" });
  }
  const technicianFilter =
    request.user.role === Role.TECHNICIAN ? { technicianId: request.user.id } : {};

  const [clientsCount, techniciansCount, visits, upcomingRaw] = await Promise.all([
    prisma.client.count(),
    prisma.user.count({ where: { role: Role.TECHNICIAN } }),
    prisma.visit.findMany({ where: technicianFilter }),
    prisma.visit.findMany({
      where: technicianFilter,
      include: {
        client: { select: { id: true, name: true, email: true, contact: true } },
        technician: { select: { id: true, name: true, zone: true } },
      },
    }),
  ]);

  const today = dayjs().startOf("day");
  const windowEnd = today.add(21, "day").endOf("day");
  const schedule = expandVisits(upcomingRaw, today.toDate(), windowEnd.toDate()).sort((left, right) =>
    left.occurrenceStart.localeCompare(right.occurrenceStart),
  );

  response.json({
    stats: {
      clients: clientsCount,
      technicians: techniciansCount,
      recurringVisits: visits.filter((visit) => visit.recurrence !== "NONE").length,
      todayVisits: schedule.filter((visit) => dayjs(visit.occurrenceStart).isSame(today, "day"))
        .length,
    },
    upcomingVisits: schedule.slice(0, 6),
  });
});

app.get("/integrations/microsoft/status", requireAuth, requireRole([Role.ADMIN]), async (_request, response) => {
  try {
    response.json(await getMicrosoftIntegrationStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible obtener el estado";
    response.status(500).json({ message });
  }
});

app.get("/integrations/microsoft/connect", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  if (!request.user) {
    return response.status(401).json({ message: "No autorizado" });
  }

  try {
    response.json({
      authUrl: getMicrosoftAuthUrl(request.user.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible iniciar la conexion";
    response.status(500).json({ message });
  }
});

app.post("/integrations/microsoft/sync", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const parsed = microsoftSyncSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Solicitud de sincronizacion invalida" });
  }

  try {
    response.json(await syncMicrosoftTechnicianCalendar(parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible sincronizar Outlook";
    response.status(500).json({ message });
  }
});

app.get("/clients", requireAuth, async (_request, response) => {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { visits: true } } },
  });
  response.json(clients);
});

app.post("/clients", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const parsed = clientSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Datos del cliente invalidos" });
  }

  const client = await prisma.client.create({ data: parsed.data });
  response.status(201).json(client);
});

app.get("/technicians", requireAuth, async (_request, response) => {
  const technicians = await prisma.user.findMany({
    where: { role: Role.TECHNICIAN },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      zone: true,
      specialty: true,
      _count: { select: { assignedVisits: true } },
    },
  });
  response.json(technicians);
});

app.post("/technicians", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const parsed = technicianSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Datos del tecnico invalidos" });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return response.status(400).json({ message: "Ya existe un usuario con ese correo" });
  }

  const technician = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: Role.TECHNICIAN,
      phone: parsed.data.phone || null,
      zone: parsed.data.zone || null,
      specialty: parsed.data.specialty || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      zone: true,
      specialty: true,
      _count: { select: { assignedVisits: true } },
    },
  });

  response.status(201).json(technician);
});

app.patch("/technicians/:id", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const parsed = technicianUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Actualizacion de tecnico invalida" });
  }

  const existing = await prisma.user.findUnique({
    where: { id: String(request.params.id) },
  });

  if (!existing || existing.role !== Role.TECHNICIAN) {
    return response.status(404).json({ message: "Tecnico no encontrado" });
  }

  if (parsed.data.email && parsed.data.email !== existing.email) {
    const duplicate = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (duplicate) {
      return response.status(400).json({ message: "Ya existe un usuario con ese correo" });
    }
  }

  const technician = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
      phone: parsed.data.phone,
      zone: parsed.data.zone,
      specialty: parsed.data.specialty,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      zone: true,
      specialty: true,
      _count: { select: { assignedVisits: true } },
    },
  });

  response.json(technician);
});

app.delete("/technicians/:id", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const existing = await prisma.user.findUnique({
    where: { id: String(request.params.id) },
    include: {
      _count: {
        select: { assignedVisits: true },
      },
    },
  });

  if (!existing || existing.role !== Role.TECHNICIAN) {
    return response.status(404).json({ message: "Tecnico no encontrado" });
  }

  if (existing._count.assignedVisits > 0) {
    return response.status(400).json({
      message: "No se puede eliminar el tecnico porque tiene visitas asignadas. Reasignalas o eliminarlas primero.",
    });
  }

  await prisma.outlookConnection.deleteMany({
    where: { accountEmail: existing.email },
  });

  await prisma.user.delete({
    where: { id: existing.id },
  });

  response.status(204).send();
});

app.delete("/technicians/:id/visits", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const existing = await prisma.user.findUnique({
    where: { id: String(request.params.id) },
  });

  if (!existing || existing.role !== Role.TECHNICIAN) {
    return response.status(404).json({ message: "Tecnico no encontrado" });
  }

  const result = await prisma.visit.deleteMany({
    where: { technicianId: existing.id },
  });

  response.json({
    deletedVisits: result.count,
    technician: {
      id: existing.id,
      name: existing.name,
    },
  });
});

app.get("/visits", requireAuth, async (request, response) => {
  if (!request.user) {
    return response.status(401).json({ message: "No autorizado" });
  }
  const start = request.query.start ? new Date(String(request.query.start)) : dayjs().startOf("week").toDate();
  const end = request.query.end ? new Date(String(request.query.end)) : dayjs().endOf("week").toDate();
  const technicianId =
    request.user.role === Role.TECHNICIAN
      ? request.user.id
      : typeof request.query.technicianId === "string"
        ? request.query.technicianId
        : undefined;

  const where = technicianId ? { technicianId } : {};

  const visits = await prisma.visit.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, email: true, contact: true } },
      technician: { select: { id: true, name: true, zone: true } },
    },
  });

  response.json(expandVisits(visits, start, end).sort((left, right) => left.occurrenceStart.localeCompare(right.occurrenceStart)));
});

app.post("/visits", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const parsed = visitSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Datos de visita invalidos" });
  }

  const visit = await prisma.visit.create({
    data: {
      ...parsed.data,
      ticketNumber: normalizeNullableText(parsed.data.ticketNumber),
      equipmentDiagnosis: normalizeNullableText(parsed.data.equipmentDiagnosis),
      equipmentStatus: normalizeNullableText(parsed.data.equipmentStatus),
      startDateTime: new Date(parsed.data.startDateTime),
    },
  });

  response.status(201).json(visit);
});

app.patch("/visits/:id", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const parsed = visitUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Actualizacion invalida" });
  }

  const visit = await prisma.visit.update({
    where: { id: String(request.params.id) },
    data: {
      ...parsed.data,
      ticketNumber:
        Object.prototype.hasOwnProperty.call(parsed.data, "ticketNumber")
          ? normalizeNullableText(parsed.data.ticketNumber)
          : undefined,
      equipmentDiagnosis:
        Object.prototype.hasOwnProperty.call(parsed.data, "equipmentDiagnosis")
          ? normalizeNullableText(parsed.data.equipmentDiagnosis)
          : undefined,
      equipmentStatus:
        Object.prototype.hasOwnProperty.call(parsed.data, "equipmentStatus")
          ? normalizeNullableText(parsed.data.equipmentStatus)
          : undefined,
      startDateTime: parsed.data.startDateTime ? new Date(parsed.data.startDateTime) : undefined,
    },
  });

  response.json(visit);
});

app.delete("/visits/:id", requireAuth, requireRole([Role.ADMIN]), async (request, response) => {
  const existing = await prisma.visit.findUnique({
    where: { id: String(request.params.id) },
  });

  if (!existing) {
    return response.status(404).json({ message: "Visita no encontrada" });
  }

  await prisma.visit.delete({
    where: { id: existing.id },
  });

  response.status(204).send();
});

app.get("/meta", requireAuth, async (_request, response) => {
  const [clients, technicians] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: Role.TECHNICIAN },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        zone: true,
        specialty: true,
      },
    }),
  ]);

  response.json({ clients, technicians });
});

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
