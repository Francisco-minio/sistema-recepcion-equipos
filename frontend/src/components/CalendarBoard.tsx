import { ClipboardText, EnvelopeSimple, FadersHorizontal, FloppyDisk } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import type {
  Client,
  MicrosoftIntegrationStatus,
  MicrosoftSyncResult,
  Recurrence,
  Role,
  Technician,
  VisitOccurrence,
} from "../types";
import { addDays, cn, formatDate, formatTimeRange, getMonthEnd, getMonthStart, getWeekStart } from "../lib/utils";

type Props = {
  role: Role;
  technicians: Technician[];
  clients: Client[];
  visits: VisitOccurrence[];
  selectedDate: Date;
  onNavigate: (date: Date) => void;
  onMoveVisit: (visitId: string, payload: { technicianId: string; startDateTime: string }) => Promise<void>;
  onUpdateVisit: (
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
  ) => Promise<void>;
  onCreateVisit: (payload: {
    title: string;
    notes?: string;
    ticketNumber?: string | null;
    equipmentDiagnosis?: string | null;
    equipmentStatus?: string | null;
    startDateTime: string;
    durationMinutes: number;
    recurrence: Recurrence;
    clientId: string;
    technicianId: string;
  }) => Promise<void>;
  onDeleteVisit?: (visitId: string) => Promise<void>;
  microsoftStatus?: MicrosoftIntegrationStatus | null;
  isMicrosoftSyncing?: boolean;
  lastMicrosoftSyncResult?: MicrosoftSyncResult | null;
  onConnectMicrosoft?: () => Promise<void>;
  onSyncMicrosoft?: (payload: { technicianId: string; start: string; end: string }) => Promise<void>;
  onLoadVisitsRange?: (start: string, end: string) => Promise<VisitOccurrence[]>;
};

const TECHNICIAN_COLOR_TOKENS = [
  {
    panel: "border-sky-400/20 bg-sky-400/[0.08]",
    chip: "border-sky-300/20 bg-sky-300/12 text-sky-100",
    dot: "bg-sky-300",
    visit: "border-sky-400/20 bg-sky-400/[0.09]",
    rail: "bg-sky-300",
  },
  {
    panel: "border-amber-400/20 bg-amber-400/[0.08]",
    chip: "border-amber-300/20 bg-amber-300/12 text-amber-100",
    dot: "bg-amber-300",
    visit: "border-amber-400/20 bg-amber-400/[0.09]",
    rail: "bg-amber-300",
  },
  {
    panel: "border-emerald-400/20 bg-emerald-400/[0.08]",
    chip: "border-emerald-300/20 bg-emerald-300/12 text-emerald-100",
    dot: "bg-emerald-300",
    visit: "border-emerald-400/20 bg-emerald-400/[0.09]",
    rail: "bg-emerald-300",
  },
  {
    panel: "border-fuchsia-400/20 bg-fuchsia-400/[0.08]",
    chip: "border-fuchsia-300/20 bg-fuchsia-300/12 text-fuchsia-100",
    dot: "bg-fuchsia-300",
    visit: "border-fuchsia-400/20 bg-fuchsia-400/[0.09]",
    rail: "bg-fuchsia-300",
  },
] as const;

type TechnicianColorToken = (typeof TECHNICIAN_COLOR_TOKENS)[number];

type TechnicianAgenda = {
  technician: Technician;
  visitsByDay: Array<{
    date: string;
    items: VisitOccurrence[];
  }>;
  totalVisits: number;
};

type VisitEditorState = {
  ticketNumber: string;
  equipmentStatus: string;
  equipmentDiagnosis: string;
};

function sanitizeWorksheetName(value: string) {
  return value.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Tecnico";
}

function normalizeInputValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function createVisitEditorState(visit: VisitOccurrence): VisitEditorState {
  return {
    ticketNumber: visit.ticketNumber || "",
    equipmentStatus: visit.equipmentStatus || "",
    equipmentDiagnosis: visit.equipmentDiagnosis || "",
  };
}

function createMailtoLink(visit: VisitOccurrence, draft: VisitEditorState) {
  const subjectParts = [`Actualización de equipo ${visit.client.name}`];

  if (draft.ticketNumber.trim()) {
    subjectParts.push(`Ticket ${draft.ticketNumber.trim()}`);
  }

  const lines = [
    `Hola ${visit.client.contact},`,
    "",
    "Te compartimos el estado actual del equipo atendido:",
    "",
    `Cliente: ${visit.client.name}`,
    `Visita: ${visit.title}`,
    `Horario: ${formatTimeRange(visit.occurrenceStart, visit.durationMinutes)}`,
    `Técnico asignado: ${visit.technician.name}`,
    `Ticket: ${draft.ticketNumber.trim() || "Sin asignar"}`,
    `Estado del equipo: ${draft.equipmentStatus.trim() || "Sin estado informado"}`,
    "",
    "Diagnóstico:",
    draft.equipmentDiagnosis.trim() || "Sin diagnóstico registrado.",
    "",
    "Quedamos atentos.",
  ];

  return `mailto:${encodeURIComponent(visit.client.email)}?subject=${encodeURIComponent(subjectParts.join(" · "))}&body=${encodeURIComponent(
    lines.join("\n"),
  )}`;
}

function VisitItem({
  visit,
  color,
  role,
  onUpdate,
  canDelete,
  onDelete,
}: {
  visit: VisitOccurrence;
  color: TechnicianColorToken;
  role: Role;
  onUpdate: Props["onUpdateVisit"];
  canDelete: boolean;
  onDelete?: (visitId: string) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<VisitEditorState>(() => createVisitEditorState(visit));

  useEffect(() => {
    setDraft(createVisitEditorState(visit));
  }, [visit]);

  async function handleDelete() {
    if (!canDelete || !onDelete) return;
    const confirmed = window.confirm(`Eliminar la visita de ${visit.client.name} programada para ${formatTimeRange(visit.occurrenceStart, visit.durationMinutes)}?`);
    if (!confirmed) return;
    await onDelete(visit.id);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onUpdate(visit.id, {
        ticketNumber: normalizeInputValue(draft.ticketNumber),
        equipmentStatus: normalizeInputValue(draft.equipmentStatus),
        equipmentDiagnosis: normalizeInputValue(draft.equipmentDiagnosis),
      });
    } finally {
      setIsSaving(false);
    }
  }

  const hasManagementData = Boolean(visit.ticketNumber || visit.equipmentStatus || visit.equipmentDiagnosis);
  const mailtoLink = createMailtoLink(visit, draft);

  return (
    <article className={cn("relative overflow-hidden rounded-2xl border px-3 py-3", color.visit)}>
      <span className={cn("absolute inset-y-0 left-0 w-1", color.rail)} />
      <div className="space-y-3 pl-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
              {formatTimeRange(visit.occurrenceStart, visit.durationMinutes)}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{visit.client.name}</p>
            <p className="text-xs text-slate-300">{visit.technician.name}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <a
              href={mailtoLink}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-100 transition hover:bg-emerald-400/16"
            >
              <EnvelopeSimple size={12} weight="bold" />
              Enviar correo
            </a>
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-medium text-slate-100 transition hover:bg-white/12"
            >
              {isExpanded ? "Ocultar" : role === "ADMIN" ? "Gestionar" : "Ver detalle"}
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[10px] font-medium text-rose-100 transition hover:bg-rose-400/16"
              >
                Eliminar
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 text-slate-200">
            Ticket: {visit.ticketNumber || "Sin asignar"}
          </span>
          <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 text-slate-200">
            Estado: {visit.equipmentStatus || "Sin informar"}
          </span>
          {hasManagementData ? (
            <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 text-slate-200">
              Diagnóstico registrado
            </span>
          ) : null}
        </div>

        {visit.equipmentDiagnosis ? <p className="text-xs leading-5 text-slate-300">{visit.equipmentDiagnosis}</p> : null}

        {isExpanded ? (
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <ClipboardText size={16} weight="duotone" />
              <p className="text-sm font-medium">Gestión de entrega y diagnóstico</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Número de ticket</span>
                <input
                  type="text"
                  value={draft.ticketNumber}
                  onChange={(event) => setDraft((current) => ({ ...current, ticketNumber: event.target.value }))}
                  placeholder="Ej: ST-2026-184"
                  readOnly={role !== "ADMIN"}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 read-only:cursor-default read-only:opacity-80"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Estado del equipo</span>
                <input
                  type="text"
                  value={draft.equipmentStatus}
                  onChange={(event) => setDraft((current) => ({ ...current, equipmentStatus: event.target.value }))}
                  placeholder="Ej: Para entrega"
                  readOnly={role !== "ADMIN"}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 read-only:cursor-default read-only:opacity-80"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Diagnóstico del equipo</span>
              <textarea
                rows={4}
                value={draft.equipmentDiagnosis}
                onChange={(event) => setDraft((current) => ({ ...current, equipmentDiagnosis: event.target.value }))}
                placeholder="Describe hallazgos, trabajos realizados y próximos pasos."
                readOnly={role !== "ADMIN"}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 read-only:cursor-default read-only:opacity-80"
              />
            </label>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs leading-5 text-slate-400">
                El correo se abrirá dirigido a {visit.client.contact} en {visit.client.email} con ticket, estado y diagnóstico.
              </p>
              {role === "ADMIN" ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FloppyDisk size={14} weight="bold" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function CalendarBoard({
  role,
  technicians,
  clients: _clients,
  visits,
  selectedDate,
  onNavigate,
  onUpdateVisit,
  microsoftStatus,
  isMicrosoftSyncing,
  lastMicrosoftSyncResult,
  onConnectMicrosoft,
  onSyncMicrosoft,
  onLoadVisitsRange,
  onDeleteVisit,
}: Props) {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("week");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("all");
  const [syncTechnicianId, setSyncTechnicianId] = useState<string>(technicians[0]?.id || "");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => getWeekStart(selectedDate).toISOString().slice(0, 10));
  const [exportEndDate, setExportEndDate] = useState(() => addDays(getWeekStart(selectedDate), 6).toISOString().slice(0, 10));

  useEffect(() => {
    if (!syncTechnicianId && technicians[0]?.id) {
      setSyncTechnicianId(technicians[0].id);
    }
  }, [syncTechnicianId, technicians]);

  const weekStart = getWeekStart(selectedDate);
  const monthStart = getMonthStart(selectedDate);
  const monthEnd = getMonthEnd(selectedDate);
  const rangeDays =
    viewMode === "month"
      ? Array.from({ length: monthEnd.getDate() }, (_, index) => addDays(monthStart, index))
      : viewMode === "week"
        ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
        : [selectedDate];
  const rangeStart = rangeDays[0].toISOString().slice(0, 10);
  const rangeEnd = rangeDays[rangeDays.length - 1].toISOString().slice(0, 10);

  const calendarTitle =
    viewMode === "month"
      ? formatDate(selectedDate.toISOString(), {
          month: "long",
          year: "numeric",
        })
      : viewMode === "week"
        ? `${formatDate(rangeDays[0].toISOString(), { day: "numeric", month: "long" })} - ${formatDate(
            rangeDays[rangeDays.length - 1].toISOString(),
            {
              day: "numeric",
              month: "long",
              year: "numeric",
            },
          )}`
        : formatDate(selectedDate.toISOString(), {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

  const technicianColors = new Map(
    technicians.map((technician, index) => [
      technician.id,
      TECHNICIAN_COLOR_TOKENS[index % TECHNICIAN_COLOR_TOKENS.length],
    ]),
  );

  const filteredTechnicians = useMemo(() => {
    if (selectedTechnicianId === "all") return technicians;
    return technicians.filter((technician) => technician.id === selectedTechnicianId);
  }, [selectedTechnicianId, technicians]);

  const filteredVisits = useMemo(() => {
    return visits
      .filter((visit) => {
        const visitDate = visit.occurrenceStart.slice(0, 10);
        const matchesTechnician = selectedTechnicianId === "all" || visit.technician.id === selectedTechnicianId;
        return matchesTechnician && visitDate >= rangeStart && visitDate <= rangeEnd;
      })
      .sort((left, right) => left.occurrenceStart.localeCompare(right.occurrenceStart));
  }, [rangeEnd, rangeStart, selectedTechnicianId, visits]);

  const technicianAgenda = useMemo<TechnicianAgenda[]>(() => {
    return filteredTechnicians.map((technician) => {
      const technicianVisits = filteredVisits.filter((visit) => visit.technician.id === technician.id);
      const grouped = new Map<string, VisitOccurrence[]>();

      for (const visit of technicianVisits) {
        const dateKey = visit.occurrenceStart.slice(0, 10);
        const current = grouped.get(dateKey) || [];
        current.push(visit);
        grouped.set(dateKey, current);
      }

      return {
        technician,
        visitsByDay: Array.from(grouped.entries()).map(([date, items]) => ({
          date,
          items,
        })),
        totalVisits: technicianVisits.length,
      };
    });
  }, [filteredTechnicians, filteredVisits]);

  const exportAgenda = useMemo<TechnicianAgenda[]>(() => {
    const exportVisits = visits
      .filter((visit) => {
        const visitDate = visit.occurrenceStart.slice(0, 10);
        const matchesTechnician = selectedTechnicianId === "all" || visit.technician.id === selectedTechnicianId;
        return matchesTechnician && visitDate >= exportStartDate && visitDate <= exportEndDate;
      })
      .sort((left, right) => left.occurrenceStart.localeCompare(right.occurrenceStart));

    return filteredTechnicians.map((technician) => {
      const technicianVisits = exportVisits.filter((visit) => visit.technician.id === technician.id);
      const grouped = new Map<string, VisitOccurrence[]>();

      for (const visit of technicianVisits) {
        const dateKey = visit.occurrenceStart.slice(0, 10);
        const current = grouped.get(dateKey) || [];
        current.push(visit);
        grouped.set(dateKey, current);
      }

      return {
        technician,
        visitsByDay: Array.from(grouped.entries()).map(([date, items]) => ({
          date,
          items,
        })),
        totalVisits: technicianVisits.length,
      };
    });
  }, [exportEndDate, exportStartDate, filteredTechnicians, selectedTechnicianId, visits]);

  async function handleMicrosoftSync() {
    if (!syncTechnicianId || !onSyncMicrosoft) {
      return;
    }

    await onSyncMicrosoft({
      technicianId: syncTechnicianId,
      start: new Date(`${rangeStart}T00:00:00`).toISOString(),
      end: new Date(`${rangeEnd}T23:59:59`).toISOString(),
    });
  }

  async function handleExportExcel() {
    if (exportStartDate > exportEndDate) {
      return;
    }

    setIsExporting(true);
    try {
      const exportTitle = `Reporte de visitas ${formatDate(`${exportStartDate}T12:00:00`, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })} - ${formatDate(`${exportEndDate}T12:00:00`, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`;
      const exportVisits = onLoadVisitsRange
        ? await onLoadVisitsRange(
            new Date(`${exportStartDate}T00:00:00`).toISOString(),
            new Date(`${exportEndDate}T23:59:59`).toISOString(),
          )
        : visits;
      const exportFilteredVisits = exportVisits
        .filter((visit) => {
          const visitDate = visit.occurrenceStart.slice(0, 10);
          const matchesTechnician = selectedTechnicianId === "all" || visit.technician.id === selectedTechnicianId;
          return matchesTechnician && visitDate >= exportStartDate && visitDate <= exportEndDate;
        })
        .sort((left, right) => left.occurrenceStart.localeCompare(right.occurrenceStart));
      const exportWorkbookAgenda = filteredTechnicians.map((technician) => {
        const technicianVisits = exportFilteredVisits.filter((visit) => visit.technician.id === technician.id);
        const grouped = new Map<string, VisitOccurrence[]>();

        for (const visit of technicianVisits) {
          const dateKey = visit.occurrenceStart.slice(0, 10);
          const current = grouped.get(dateKey) || [];
          current.push(visit);
          grouped.set(dateKey, current);
        }

        return {
          technician,
          visitsByDay: Array.from(grouped.entries()).map(([date, items]) => ({
            date,
            items,
          })),
          totalVisits: technicianVisits.length,
        };
      });

      const workbook = XLSX.utils.book_new();

      exportWorkbookAgenda.forEach(({ technician, visitsByDay }) => {
        const rows = visitsByDay.flatMap((group) =>
          group.items.map((visit) => ({
            Fecha: formatDate(`${group.date}T12:00:00`, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            Horario: formatTimeRange(visit.occurrenceStart, visit.durationMinutes),
            Cliente: visit.client.name,
            Tecnico: visit.technician.name,
          })),
        );

        const sheetRows = [
          { Fecha: exportTitle, Horario: "", Cliente: "", Tecnico: "" },
          { Fecha: "Tecnico", Horario: technician.name, Cliente: "", Tecnico: "" },
          { Fecha: "Zona", Horario: technician.zone || "Soporte TI", Cliente: "", Tecnico: "" },
          { Fecha: "", Horario: "", Cliente: "", Tecnico: "" },
          ...(rows.length
            ? rows
            : [{ Fecha: "Sin visitas programadas en el rango seleccionado", Horario: "", Cliente: "", Tecnico: "" }]),
        ];

        const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
          header: ["Fecha", "Horario", "Cliente", "Tecnico"],
        });
        worksheet["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 28 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeWorksheetName(technician.name));
      });

      const safeDate = `${exportStartDate.replace(/-/g, "")}-${exportEndDate.replace(/-/g, "")}`;
      XLSX.writeFileXLSX(workbook, `reporte-visitas-${safeDate}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Visitas programadas</p>
            <h2 className="mt-1 text-xl font-semibold text-white md:text-2xl">{calendarTitle}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300">
              <span>Desde</span>
              <input
                type="date"
                value={exportStartDate}
                onChange={(event) => setExportStartDate(event.target.value)}
                className="bg-transparent text-xs text-white outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300">
              <span>Hasta</span>
              <input
                type="date"
                value={exportEndDate}
                onChange={(event) => setExportEndDate(event.target.value)}
                className="bg-transparent text-xs text-white outline-none"
              />
            </label>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || exportStartDate > exportEndDate || exportAgenda.every((entry) => entry.totalVisits === 0)}
              className="rounded-full border border-emerald-400/20 bg-emerald-400/12 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? "Exportando..." : "Exportar Excel"}
            </button>
            <button
              type="button"
              onClick={() => onNavigate(new Date())}
              className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  viewMode === "month"
                    ? new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
                    : addDays(selectedDate, viewMode === "week" ? -7 : -1),
                )
              }
              className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs",
                viewMode === "week" ? "bg-emerald-500 text-slate-950" : "border border-white/10 bg-white/6 text-slate-300",
              )}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs",
                viewMode === "month" ? "bg-emerald-500 text-slate-950" : "border border-white/10 bg-white/6 text-slate-300",
              )}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs",
                viewMode === "day" ? "bg-emerald-500 text-slate-950" : "border border-white/10 bg-white/6 text-slate-300",
              )}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  viewMode === "month"
                    ? new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
                    : addDays(selectedDate, viewMode === "week" ? 7 : 1),
                )
              }
              className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {role === "ADMIN" ? (
        <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-sky-200">Microsoft 365</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Sincronización con Outlook</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Conecta una cuenta de Microsoft 365 con acceso a los calendarios de los técnicos y sincroniza las visitas
                programadas al rango que estás revisando.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onConnectMicrosoft?.()}
                disabled={!microsoftStatus?.configured}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {microsoftStatus?.connected ? "Reconectar Microsoft 365" : "Conectar Microsoft 365"}
              </button>
              <button
                type="button"
                onClick={handleMicrosoftSync}
                disabled={!microsoftStatus?.connected || !syncTechnicianId || Boolean(isMicrosoftSyncing)}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMicrosoftSyncing ? "Sincronizando..." : "Sincronizar técnico"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-[20px] border border-white/10 bg-black/15 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Estado</p>
              <div className="mt-2 space-y-1 text-sm text-slate-200">
                <p>
                  Configuración del servidor:{" "}
                  <span className={microsoftStatus?.configured ? "text-emerald-300" : "text-amber-300"}>
                    {microsoftStatus?.configured ? "lista" : "pendiente"}
                  </span>
                </p>
                <p>
                  Cuenta conectada:{" "}
                  <span className={microsoftStatus?.connected ? "text-emerald-300" : "text-slate-400"}>
                    {microsoftStatus?.accountEmail || "ninguna"}
                  </span>
                </p>
                {microsoftStatus?.lastSyncAt ? (
                  <p>
                    Última sincronización:{" "}
                    {formatDate(microsoftStatus.lastSyncAt, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : (
                  <p className="text-slate-400">Todavía no hay sincronizaciones registradas.</p>
                )}
                {lastMicrosoftSyncResult ? (
                  <p className="text-emerald-200">
                    Última carga: {lastMicrosoftSyncResult.technician.name} · {lastMicrosoftSyncResult.imported} nuevas ·{" "}
                    {lastMicrosoftSyncResult.updated} actualizadas
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/15 p-3">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-400">Técnico a sincronizar</span>
                <select
                  value={syncTechnicianId}
                  onChange={(event) => setSyncTechnicianId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                >
                  <option value="">Seleccionar técnico</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                El sistema usará el correo del técnico para leer su calendario en Outlook dentro del rango visible.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-white/10 bg-white/6 p-3 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 text-slate-300">
          <div className="rounded-xl border border-white/10 bg-black/15 p-2">
            <FadersHorizontal size={16} weight="duotone" />
          </div>
          <p className="text-sm font-medium">Filtrar técnicos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTechnicianId("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              selectedTechnicianId === "all"
                ? "border-white/20 bg-white/14 text-white"
                : "border-white/8 bg-black/15 text-slate-300 hover:bg-white/8",
            )}
          >
            Todos
          </button>
          {technicians.map((technician) => {
            const color = technicianColors.get(technician.id)!;
            return (
              <button
                key={technician.id}
                type="button"
                onClick={() => setSelectedTechnicianId(technician.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                  selectedTechnicianId === technician.id
                    ? cn("text-white", color.panel)
                    : "border-white/8 bg-black/15 text-slate-300 hover:bg-white/8",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", color.dot)} />
                <span>{technician.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {technicianAgenda.map(({ technician, visitsByDay, totalVisits }) => {
          const color = technicianColors.get(technician.id)!;

          return (
            <section key={technician.id} className={cn("rounded-[28px] border p-4 backdrop-blur-xl", color.panel)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full", color.dot)} />
                    <h3 className="truncate text-lg font-semibold text-white">{technician.name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{technician.zone || "Soporte TI"}</p>
                </div>
                <span className={cn("rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]", color.chip)}>
                  {totalVisits} visitas
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {visitsByDay.length ? (
                  visitsByDay.map((group) => (
                    <div key={`${technician.id}-${group.date}`} className="rounded-[22px] border border-white/10 bg-black/15 p-3">
                      <p className="text-sm font-semibold capitalize text-white">
                        {formatDate(`${group.date}T12:00:00`, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      <div className="mt-3 space-y-2">
                        {group.items.map((visit) => (
                          <VisitItem
                            key={`${visit.id}-${visit.occurrenceStart}`}
                            visit={visit}
                            color={color}
                            role={role}
                            onUpdate={onUpdateVisit}
                            canDelete={role === "ADMIN"}
                            onDelete={onDeleteVisit}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-white/10 bg-black/15 px-4 py-5 text-sm text-slate-400">
                    No hay visitas programadas para este técnico en el rango seleccionado.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
