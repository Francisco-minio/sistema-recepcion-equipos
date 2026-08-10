import { ClockCounterClockwise, UsersThree, Buildings, CalendarDots } from "@phosphor-icons/react";
import type { DashboardPayload } from "../types";
import { formatDate } from "../lib/utils";

type Props = {
  data: DashboardPayload;
};

export function OverviewPanel({ data }: Props) {
  const stats = [
    {
      label: "Clientes activos",
      value: data.stats.clients,
      note: "Empresas con ficha operativa vigente",
      icon: <Buildings size={20} weight="duotone" />,
    },
    {
      label: "Tecnicos",
      value: data.stats.technicians,
      note: "Especialistas disponibles en agenda",
      icon: <UsersThree size={20} weight="duotone" />,
    },
    {
      label: "Visitas de hoy",
      value: data.stats.todayVisits,
      note: "Bloques comprometidos hoy",
      icon: <CalendarDots size={20} weight="duotone" />,
    },
    {
      label: "Recurrencias activas",
      value: data.stats.recurringVisits,
      note: "Series con mantencion programada",
      icon: <ClockCounterClockwise size={20} weight="duotone" />,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-[30px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.28)] backdrop-blur-xl"
          >
            <div className="mb-8 flex items-center justify-between text-slate-300">
              <span className="text-sm uppercase tracking-[0.18em]">{stat.label}</span>
              {stat.icon}
            </div>
            <strong className="block text-4xl font-semibold tracking-tight text-white">{stat.value}</strong>
            <p className="mt-3 text-sm leading-7 text-slate-400">{stat.note}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Agenda inmediata</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Proximas visitas</h2>
          <div className="mt-6 space-y-3">
            {data.upcomingVisits.map((visit) => (
              <div
                key={`${visit.id}-${visit.occurrenceStart}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"
              >
                <div>
                  <p className="font-medium text-white">{visit.title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {visit.client.name} · {visit.technician.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-300">
                    {formatDate(visit.occurrenceStart, {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{visit.recurrence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.22em] text-amber-300">Estado operativo</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Ritmo del servicio</h2>
          <div className="mt-6 space-y-5">
            <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
              <p className="text-sm text-slate-400">Vista recomendada</p>
              <p className="mt-2 text-lg font-medium text-white">Calendario semanal por tecnico</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Permite detectar saturacion, huecos operativos y reasignar visitas con menos friccion.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
              <p className="text-sm text-slate-400">Persistencia</p>
              <p className="mt-2 text-lg font-medium text-white">Base SQLite con seed inicial</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Ideal para este MVP y facil de migrar despues a PostgreSQL sin cambiar el dominio.
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
