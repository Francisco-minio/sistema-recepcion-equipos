import { Recurrence } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const clientSchema = z.object({
  name: z.string().min(2),
  contact: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  address: z.string().min(5),
  notes: z.string().optional().nullable(),
});

export const technicianSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
});

export const technicianUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
});

export const visitSchema = z.object({
  title: z.string().min(3),
  notes: z.string().optional().nullable(),
  ticketNumber: z.string().trim().min(1).max(60).optional().nullable(),
  equipmentDiagnosis: z.string().trim().max(4000).optional().nullable(),
  equipmentStatus: z.string().trim().min(2).max(120).optional().nullable(),
  startDateTime: z.string().datetime(),
  durationMinutes: z.number().int().min(30).max(480),
  recurrence: z.nativeEnum(Recurrence),
  clientId: z.string().min(1),
  technicianId: z.string().min(1),
});

export const visitUpdateSchema = z.object({
  clientId: z.string().min(1).optional(),
  technicianId: z.string().min(1).optional(),
  startDateTime: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(30).max(480).optional(),
  title: z.string().min(3).optional(),
  notes: z.string().nullable().optional(),
  ticketNumber: z.string().trim().min(1).max(60).nullable().optional(),
  equipmentDiagnosis: z.string().trim().max(4000).nullable().optional(),
  equipmentStatus: z.string().trim().min(2).max(120).nullable().optional(),
  recurrence: z.nativeEnum(Recurrence).optional(),
});

export const microsoftSyncSchema = z.object({
  technicianId: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
});
