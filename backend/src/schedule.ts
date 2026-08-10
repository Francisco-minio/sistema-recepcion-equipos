import { Recurrence, type Visit } from "@prisma/client";
import dayjs from "dayjs";

type VisitWithRelations = Visit & {
  client: { id: string; name: string; email: string; contact: string };
  technician: { id: string; name: string; zone: string | null };
};

export function expandVisits(visits: VisitWithRelations[], start: Date, end: Date) {
  return visits.flatMap((visit) => expandVisit(visit, start, end));
}

function expandVisit(visit: VisitWithRelations, start: Date, end: Date) {
  const base = dayjs(visit.startDateTime);
  const startDay = dayjs(start);
  const endDay = dayjs(end);
  const recurrenceDays = getRecurrenceDays(visit.recurrence);

  if (!recurrenceDays) {
    if (base.isAfter(endDay) || base.isBefore(startDay)) {
      return [];
    }

    return [serializeVisit(visit, base.toDate())];
  }

  const expanded = [];
  let cursor = base;

  while (cursor.isBefore(startDay)) {
    cursor = cursor.add(recurrenceDays, "day");
  }

  while (cursor.isBefore(endDay) || cursor.isSame(endDay)) {
    expanded.push(serializeVisit(visit, cursor.toDate()));
    cursor = cursor.add(recurrenceDays, "day");
  }

  return expanded;
}

function serializeVisit(visit: VisitWithRelations, occurrence: Date) {
  return {
    id: visit.id,
    occurrenceStart: occurrence.toISOString(),
    occurrenceEnd: dayjs(occurrence).add(visit.durationMinutes, "minute").toISOString(),
    title: visit.title,
    notes: visit.notes,
    ticketNumber: visit.ticketNumber,
    equipmentDiagnosis: visit.equipmentDiagnosis,
    equipmentStatus: visit.equipmentStatus,
    durationMinutes: visit.durationMinutes,
    recurrence: visit.recurrence,
    status: visit.status,
    client: visit.client,
    technician: visit.technician,
  };
}

function getRecurrenceDays(recurrence: Recurrence) {
  if (recurrence === Recurrence.WEEKLY) return 7;
  if (recurrence === Recurrence.BIWEEKLY) return 14;
  if (recurrence === Recurrence.MONTHLY) return 30;
  return 0;
}
