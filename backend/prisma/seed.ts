import bcrypt from "bcryptjs";
import { PrismaClient, Recurrence, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.visit.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);
  const techPasswordHash = await bcrypt.hash("tecnico123", 10);

  const [admin, camila, diego, valentina] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Administrador TI",
        email: "admin@servicehub.local",
        passwordHash,
        role: Role.ADMIN,
        phone: "+56 9 5555 1111",
      },
    }),
    prisma.user.create({
      data: {
        name: "Camila Soto",
        email: "camila@servicehub.local",
        passwordHash: techPasswordHash,
        role: Role.TECHNICIAN,
        phone: "+56 9 4512 8821",
        zone: "Santiago Centro",
        specialty: "Infraestructura y redes",
      },
    }),
    prisma.user.create({
      data: {
        name: "Diego Herrera",
        email: "diego@servicehub.local",
        passwordHash: techPasswordHash,
        role: Role.TECHNICIAN,
        phone: "+56 9 6823 1174",
        zone: "Providencia y Las Condes",
        specialty: "Soporte usuario final",
      },
    }),
    prisma.user.create({
      data: {
        name: "Valentina Ruiz",
        email: "valentina@servicehub.local",
        passwordHash: techPasswordHash,
        role: Role.TECHNICIAN,
        phone: "+56 9 7344 9810",
        zone: "Maipu y Pudahuel",
        specialty: "Servidores y respaldo",
      },
    }),
  ]);

  const [clinica, constructora, colegio] = await Promise.all([
    prisma.client.create({
      data: {
        name: "Clinica Los Andes",
        contact: "Marcela Pizarro",
        email: "mpizarro@cliniclosandes.cl",
        phone: "+56 2 2671 0191",
        address: "Av. Apoquindo 4210, Las Condes",
        notes: "Mesa de ayuda en piso 3. Ventana ideal: 09:00 a 13:00.",
      },
    }),
    prisma.client.create({
      data: {
        name: "Constructora Altavista",
        contact: "Renato Molina",
        email: "renato.molina@altavista.cl",
        phone: "+56 2 2890 7720",
        address: "Av. Vitacura 2280, Vitacura",
        notes: "Validar acceso con recepcion y estacionamiento tecnico.",
      },
    }),
    prisma.client.create({
      data: {
        name: "Colegio Futuro",
        contact: "Anais Correa",
        email: "acorrea@colegiofuturo.cl",
        phone: "+56 2 2522 3314",
        address: "Camino Melipilla 8890, Maipu",
        notes: "Atencion preferente despues de las 14:30 por clases.",
      },
    }),
  ]);

  await prisma.visit.createMany({
    data: [
      {
        title: "Mantencion preventiva",
        notes: "Revision de switches, puntos de acceso y estado general.",
        startDateTime: new Date("2026-06-02T09:00:00.000Z"),
        durationMinutes: 120,
        recurrence: Recurrence.MONTHLY,
        clientId: clinica.id,
        technicianId: camila.id,
      },
      {
        title: "Soporte estaciones de trabajo",
        notes: "Actualizacion de equipos contables y revision de impresoras.",
        startDateTime: new Date("2026-06-03T14:30:00.000Z"),
        durationMinutes: 90,
        recurrence: Recurrence.NONE,
        clientId: constructora.id,
        technicianId: diego.id,
      },
      {
        title: "Respaldo y revision de servidor",
        notes: "Comprobar logs de backup y consumo de almacenamiento.",
        startDateTime: new Date("2026-06-04T18:00:00.000Z"),
        durationMinutes: 120,
        recurrence: Recurrence.WEEKLY,
        clientId: colegio.id,
        technicianId: valentina.id,
      },
    ],
  });

  console.log({
    admin: { email: admin.email, password: "admin123" },
    technician: { email: camila.email, password: "tecnico123" },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
