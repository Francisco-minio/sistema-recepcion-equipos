import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./db.js";
import {
  deriveVisitData,
  juneScheduleRows,
  parseScheduleDate,
  technicianDirectory,
} from "./scheduleData.js";

export async function importSchedule(options?: { skipIfAdminExists?: boolean }) {
  if (options?.skipIfAdminExists) {
    const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (existingAdmin) {
      console.log("Seed skipped: database already initialized");
      return;
    }
  }

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const techPasswordHash = await bcrypt.hash("tecnico123", 10);

  await prisma.visit.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany({ where: { role: Role.TECHNICIAN } });

  await prisma.user.upsert({
    where: { email: "admin@servicehub.local" },
    update: {
      name: "Administrador TI",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      phone: "+56 9 5555 1111",
    },
    create: {
      name: "Administrador TI",
      email: "admin@servicehub.local",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      phone: "+56 9 5555 1111",
    },
  });

  const technicians = new Map<string, string>();

  for (const technician of technicianDirectory) {
    const created = await prisma.user.create({
      data: {
        name: technician.name,
        email: technician.email,
        passwordHash: techPasswordHash,
        role: Role.TECHNICIAN,
        phone: technician.phone,
        zone: technician.zone,
        specialty: technician.specialty,
      },
    });
    technicians.set(technician.name, created.id);
  }

  const clients = new Map<string, string>();

  for (const row of juneScheduleRows) {
    const visitMeta = deriveVisitData(row.activity);

    if (!clients.has(visitMeta.clientName)) {
      const client = await prisma.client.create({
        data: {
          name: visitMeta.clientName,
          contact: "Por definir",
          email: `${slugify(visitMeta.clientName)}@cliente.local`,
          phone: "Por definir",
          address: "Por definir",
          notes: `Cliente cargado desde agenda junio 2026. Origen: ${row.activity}.`,
        },
      });
      clients.set(visitMeta.clientName, client.id);
    }

    const timeData = parseScheduleDate(row.date, row.timeRange);
    await prisma.visit.create({
      data: {
        title: visitMeta.title,
        notes: `${visitMeta.notes}. Horario original: ${row.timeRange}.`,
        startDateTime: timeData.startDateTime,
        durationMinutes: timeData.durationMinutes,
        recurrence: visitMeta.recurrence,
        clientId: clients.get(visitMeta.clientName)!,
        technicianId: technicians.get(row.technician)!,
      },
    });
  }

  console.log({
    admin: { email: "admin@servicehub.local", password: "admin123" },
    technicians: technicianDirectory.map((technician) => ({
      name: technician.name,
      email: technician.email,
      password: "tecnico123",
    })),
    importedVisits: juneScheduleRows.length,
    importedClients: clients.size,
  });
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

const isDirectRun = process.argv[1]?.endsWith("importSchedule.ts") || process.argv[1]?.endsWith("importSchedule.js");

if (isDirectRun) {
  importSchedule()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
