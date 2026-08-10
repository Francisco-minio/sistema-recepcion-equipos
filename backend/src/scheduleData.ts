import { Recurrence } from "@prisma/client";

export type RawScheduleRow = {
  technician: string;
  date: string;
  activity: string;
  timeRange: string;
};

export const technicianDirectory = [
  {
    name: "Fernando C. Pérez D.",
    email: "fernando.perez@servicehub.local",
    phone: "+56 9 7000 1001",
    zone: "Puerto Montt y Osorno",
    specialty: "Soporte en terreno",
  },
  {
    name: "Fernando Navarro",
    email: "fernando.navarro@servicehub.local",
    phone: "+56 9 7000 1002",
    zone: "Puerto Montt",
    specialty: "Mantenciones preventivas",
  },
  {
    name: "Eduardo Bustos M.",
    email: "eduardo.bustos@servicehub.local",
    phone: "+56 9 7000 1003",
    zone: "Sur Austral",
    specialty: "Soporte mixto y remoto",
  },
] as const;

export const juneScheduleRows: RawScheduleRow[] = [
  { technician: "Fernando C. Pérez D.", date: "01/06/2026", activity: "VISITA ECOSISTEMA", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "01/06/2026", activity: "VISITA PRETOR", timeRange: "14:30 - 18:00" },
  { technician: "Fernando C. Pérez D.", date: "02/06/2026", activity: "VISITA CUTTER", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "02/06/2026", activity: "VISITA MYM OSORNO", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "03/06/2026", activity: "VISITA ULTRASEA", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "03/06/2026", activity: "VISITA CONTADORES", timeRange: "15:00 - 18:00" },
  { technician: "Fernando C. Pérez D.", date: "04/06/2026", activity: "VISITA MARYUN", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "05/06/2026", activity: "VISITA AQUAMET", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "08/06/2026", activity: "VISITA ECOSISTEMA", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "09/06/2026", activity: "VISITA EMPRESUR", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "10/06/2026", activity: "VISITA STIM", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "11/06/2026", activity: "VISITA MARYUN", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "12/06/2026", activity: "VISITA AQUAMET", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "15/06/2026", activity: "VISITA ECOSISTEMA", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "15/06/2026", activity: "VISITA PRETOR", timeRange: "14:30 - 18:00" },
  { technician: "Fernando C. Pérez D.", date: "16/06/2026", activity: "VISITA CUTTER", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "17/06/2026", activity: "VISITA ULTRASEA", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "17/06/2026", activity: "VISITA CONTADORES", timeRange: "15:00 - 18:00" },
  { technician: "Fernando C. Pérez D.", date: "18/06/2026", activity: "VISITA MARYUN", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "19/06/2026", activity: "VISITA AQUAMET", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "22/06/2026", activity: "VISITA ECOSISTEMA", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "23/06/2026", activity: "VISITA EMPRESUR", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "24/06/2026", activity: "VISITA STIM", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "24/06/2026", activity: "VISITA REXIN CENTRO", timeRange: "09:30 - 10:00" },
  { technician: "Fernando C. Pérez D.", date: "25/06/2026", activity: "VISITA MARYUN", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "25/06/2026", activity: "VISITA MYM PUERTO MONTT", timeRange: "14:30 - 18:00" },
  { technician: "Fernando C. Pérez D.", date: "26/06/2026", activity: "VISITA AQUAMET", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "29/06/2026", activity: "VISITA ECOSISTEMA", timeRange: "09:30 - 13:00" },
  { technician: "Fernando C. Pérez D.", date: "29/06/2026", activity: "VISITA PRETOR", timeRange: "14:30 - 18:00" },
  { technician: "Fernando C. Pérez D.", date: "30/06/2026", activity: "VISITA CUTTER", timeRange: "09:30 - 13:00" },

  { technician: "Fernando Navarro", date: "01/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "01/06/2026", activity: "COFRE", timeRange: "15:00 - 17:30" },
  { technician: "Fernando Navarro", date: "02/06/2026", activity: "Schmidt", timeRange: "09:00 - 11:30" },
  { technician: "Fernando Navarro", date: "02/06/2026", activity: "Mendez RT", timeRange: "11:30 - 13:30" },
  { technician: "Fernando Navarro", date: "02/06/2026", activity: "SSF - Mantención preventiva", timeRange: "15:00 - 18:00" },
  { technician: "Fernando Navarro", date: "03/06/2026", activity: "Aquabench", timeRange: "09:30 - 13:00" },
  { technician: "Fernando Navarro", date: "04/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "05/06/2026", activity: "Herkas (Visita terreno)", timeRange: "09:00 - 12:00" },
  { technician: "Fernando Navarro", date: "08/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "08/06/2026", activity: "CONTROL UNION", timeRange: "14:00 - 18:00" },
  { technician: "Fernando Navarro", date: "09/06/2026", activity: "Schmidt", timeRange: "09:00 - 11:30" },
  { technician: "Fernando Navarro", date: "09/06/2026", activity: "Mendez RT", timeRange: "11:30 - 13:30" },
  { technician: "Fernando Navarro", date: "09/06/2026", activity: "SSF - Mantención preventiva", timeRange: "15:00 - 18:00" },
  { technician: "Fernando Navarro", date: "10/06/2026", activity: "Aquabench", timeRange: "09:30 - 13:00" },
  { technician: "Fernando Navarro", date: "10/06/2026", activity: "Leyad", timeRange: "14:30 - 17:30" },
  { technician: "Fernando Navarro", date: "11/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "11/06/2026", activity: "Roxana", timeRange: "14:00 - 17:00" },
  { technician: "Fernando Navarro", date: "12/06/2026", activity: "Herkas (Visita terreno)", timeRange: "09:00 - 12:00" },
  { technician: "Fernando Navarro", date: "15/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "16/06/2026", activity: "Schmidt", timeRange: "09:00 - 11:30" },
  { technician: "Fernando Navarro", date: "16/06/2026", activity: "Mendez RT", timeRange: "11:30 - 13:30" },
  { technician: "Fernando Navarro", date: "16/06/2026", activity: "SSF - Mantención preventiva", timeRange: "15:00 - 18:00" },
  { technician: "Fernando Navarro", date: "17/06/2026", activity: "Aquabench", timeRange: "09:30 - 13:00" },
  { technician: "Fernando Navarro", date: "18/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "19/06/2026", activity: "Herkas (Visita terreno)", timeRange: "09:00 - 12:00" },
  { technician: "Fernando Navarro", date: "22/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "23/06/2026", activity: "Schmidt", timeRange: "09:00 - 11:30" },
  { technician: "Fernando Navarro", date: "23/06/2026", activity: "Mendez RT", timeRange: "11:30 - 13:30" },
  { technician: "Fernando Navarro", date: "23/06/2026", activity: "SSF - Mantención preventiva", timeRange: "15:00 - 18:00" },
  { technician: "Fernando Navarro", date: "24/06/2026", activity: "Aquabench", timeRange: "09:30 - 13:00" },
  { technician: "Fernando Navarro", date: "24/06/2026", activity: "Leyad", timeRange: "14:30 - 17:30" },
  { technician: "Fernando Navarro", date: "25/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "25/06/2026", activity: "Roxana", timeRange: "14:00 - 17:00" },
  { technician: "Fernando Navarro", date: "26/06/2026", activity: "Herkas (Visita terreno)", timeRange: "09:00 - 12:00" },
  { technician: "Fernando Navarro", date: "26/06/2026", activity: "Ccofre", timeRange: "15:00 - 18:00" },
  { technician: "Fernando Navarro", date: "29/06/2026", activity: "Kura", timeRange: "09:30 - 12:30" },
  { technician: "Fernando Navarro", date: "30/06/2026", activity: "Schmidt", timeRange: "09:00 - 11:30" },
  { technician: "Fernando Navarro", date: "30/06/2026", activity: "Mendez RT", timeRange: "11:30 - 13:30" },
  { technician: "Fernando Navarro", date: "30/06/2026", activity: "SSF - Mantención preventiva", timeRange: "15:00 - 18:00" },

  { technician: "Eduardo Bustos M.", date: "01/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "02/06/2026", activity: "GAMI", timeRange: "15:03 - 17:33" },
  { technician: "Eduardo Bustos M.", date: "03/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "03/06/2026", activity: "KAWESHKAR chamiza", timeRange: "14:30 - 18:00" },
  { technician: "Eduardo Bustos M.", date: "05/06/2026", activity: "RTI motores lanchas cardonal", timeRange: "15:00 - 17:30" },
  { technician: "Eduardo Bustos M.", date: "08/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "08/06/2026", activity: "PATHOVED CENTRO", timeRange: "14:30 - 17:00" },
  { technician: "Eduardo Bustos M.", date: "09/06/2026", activity: "APR entrelagos OSORNO", timeRange: "Todo el día" },
  { technician: "Eduardo Bustos M.", date: "10/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "11/06/2026", activity: "POLYCHEM", timeRange: "09:00 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "11/06/2026", activity: "MASCATO", timeRange: "14:00 - 16:30" },
  { technician: "Eduardo Bustos M.", date: "12/06/2026", activity: "BLUE SEA", timeRange: "09:00 - 11:00" },
  { technician: "Eduardo Bustos M.", date: "12/06/2026", activity: "SCHUMACHER", timeRange: "10:00 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "12/06/2026", activity: "GESTIONAD (REMOTO)", timeRange: "15:00 - 17:30" },
  { technician: "Eduardo Bustos M.", date: "15/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "15/06/2026", activity: "Pathovet Mamiña", timeRange: "14:30 - 18:00" },
  { technician: "Eduardo Bustos M.", date: "16/06/2026", activity: "GAMI", timeRange: "15:03 - 17:33" },
  { technician: "Eduardo Bustos M.", date: "17/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "17/06/2026", activity: "KAWESHKAR chamiza", timeRange: "14:30 - 18:00" },
  { technician: "Eduardo Bustos M.", date: "18/06/2026", activity: "POLYCHEM", timeRange: "09:00 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "18/06/2026", activity: "MASCATO", timeRange: "14:00 - 16:30" },
  { technician: "Eduardo Bustos M.", date: "19/06/2026", activity: "RTI motores lanchas cardonal", timeRange: "15:00 - 17:30" },
  { technician: "Eduardo Bustos M.", date: "22/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "23/06/2026", activity: "REXIN BASURAL", timeRange: "14:00 - 16:30" },
  { technician: "Eduardo Bustos M.", date: "24/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "26/06/2026", activity: "SCHUMACHER", timeRange: "10:00 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "26/06/2026", activity: "GESTIONAD (REMOTO)", timeRange: "15:00 - 17:30" },
  { technician: "Eduardo Bustos M.", date: "29/06/2026", activity: "adl", timeRange: "09:30 - 13:00" },
  { technician: "Eduardo Bustos M.", date: "30/06/2026", activity: "AQUA AUSTRAL", timeRange: "09:00 - 12:00" },
  { technician: "Eduardo Bustos M.", date: "30/06/2026", activity: "GAMI", timeRange: "15:03 - 17:33" },
];

export function deriveVisitData(activity: string) {
  if (activity.startsWith("VISITA ")) {
    return {
      title: "Visita técnica",
      clientName: activity.replace(/^VISITA\s+/, "").trim(),
      notes: activity,
      recurrence: Recurrence.NONE,
    };
  }

  if (activity.includes("Mantención preventiva")) {
    const [clientName] = activity.split(" - ");
    return {
      title: "Mantención preventiva",
      clientName: clientName.trim(),
      notes: activity,
      recurrence: Recurrence.NONE,
    };
  }

  if (activity.includes("(REMOTO)")) {
    return {
      title: "Soporte remoto",
      clientName: activity.replace(/\s*\(REMOTO\)\s*/g, "").trim(),
      notes: activity,
      recurrence: Recurrence.NONE,
    };
  }

  if (activity.includes("(Visita terreno)")) {
    return {
      title: "Visita terreno",
      clientName: activity.replace(/\s*\(Visita terreno\)\s*/g, "").trim(),
      notes: activity,
      recurrence: Recurrence.NONE,
    };
  }

  return {
    title: "Visita técnica",
    clientName: activity.trim(),
    notes: activity,
    recurrence: Recurrence.NONE,
  };
}

export function parseScheduleDate(date: string, timeRange: string) {
  const [day, month, year] = date.split("/").map(Number);

  if (timeRange === "Todo el día") {
    return {
      startDateTime: new Date(year, month - 1, day, 9, 0, 0),
      durationMinutes: 8 * 60,
    };
  }

  const [start, end] = timeRange.split(" - ").map((value) => value.trim());
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  const startDateTime = new Date(year, month - 1, day, startHour, startMinute, 0);
  const durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);

  return { startDateTime, durationMinutes };
}
