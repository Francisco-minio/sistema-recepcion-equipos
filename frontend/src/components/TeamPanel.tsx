import { FormEvent, useEffect, useState } from "react";
import type { Role, Technician } from "../types";
import { cn } from "../lib/utils";

type TechnicianForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  zone: string;
  specialty: string;
};

type Props = {
  technicians: Technician[];
  role: Role;
  onCreate?: (payload: TechnicianForm) => Promise<void>;
  onUpdate?: (
    technicianId: string,
    payload: Omit<TechnicianForm, "password"> & { password?: string },
  ) => Promise<void>;
  onDelete?: (technicianId: string) => Promise<void>;
  onDeleteVisits?: (technicianId: string) => Promise<void>;
};

const emptyForm: TechnicianForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  zone: "",
  specialty: "",
};

export function TeamPanel({ technicians, role, onCreate, onUpdate, onDelete, onDeleteVisits }: Props) {
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(technicians[0]?.id || "");
  const [form, setForm] = useState<TechnicianForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && technicians.length && !selectedTechnicianId) {
      setSelectedTechnicianId(technicians[0].id);
    }
  }, [mode, selectedTechnicianId, technicians]);

  useEffect(() => {
    if (mode !== "edit") {
      setForm(emptyForm);
      return;
    }

    const technician = technicians.find((item) => item.id === selectedTechnicianId);
    if (!technician) return;

    setForm({
      name: technician.name,
      email: technician.email,
      password: "",
      phone: technician.phone || "",
      zone: technician.zone || "",
      specialty: technician.specialty || "",
    });
  }, [mode, selectedTechnicianId, technicians]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "ADMIN") return;

    setIsSaving(true);
    try {
      if (mode === "create") {
        await onCreate?.(form);
        setForm(emptyForm);
      } else if (selectedTechnicianId) {
        await onUpdate?.(selectedTechnicianId, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          zone: form.zone,
          specialty: form.specialty,
          ...(form.password ? { password: form.password } : {}),
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTechnicianId || !onDelete) return;
    const technician = technicians.find((item) => item.id === selectedTechnicianId);
    if (!technician) return;

    const confirmed = window.confirm(`Eliminar a ${technician.name}? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await onDelete(selectedTechnicianId);
      setSelectedTechnicianId("");
      setForm(emptyForm);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteVisits() {
    if (!selectedTechnicianId || !onDeleteVisits) return;
    const technician = technicians.find((item) => item.id === selectedTechnicianId);
    if (!technician) return;

    const confirmed = window.confirm(
      `Eliminar todas las visitas asignadas a ${technician.name}? Esta acción borra permanentemente esas visitas.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await onDeleteVisits(selectedTechnicianId);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[30px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Equipo tecnico</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Cobertura y especialidades</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Revisa la base actual del equipo y mantén los datos operativos de cada técnico al día.
            </p>
          </div>
          {role === "ADMIN" ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm",
                  mode === "create" ? "bg-emerald-500 text-slate-950" : "border border-white/10 bg-white/6 text-slate-300",
                )}
              >
                Agregar técnico
              </button>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm",
                  mode === "edit" ? "bg-white text-slate-950" : "border border-white/10 bg-white/6 text-slate-300",
                )}
              >
                Modificar técnico
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {technicians.map((technician) => (
            <article key={technician.id} className="rounded-[26px] border border-white/10 bg-slate-950/45 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-white">{technician.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{technician.specialty || "Soporte general"}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-300">
                  {technician._count?.assignedVisits ?? 0} base
                </span>
              </div>
              <div className="mt-5 space-y-2 text-sm text-slate-400">
                <p>{technician.zone || "Zona sin definir"}</p>
                <p>{technician.phone || "Telefono no disponible"}</p>
                <p>{technician.email}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {role === "ADMIN" ? (
        <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">
                {mode === "create" ? "Nuevo técnico" : "Editar técnico"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {mode === "create" ? "Registrar técnico de soporte" : "Actualizar o eliminar técnico"}
              </h3>
            </div>
            {mode === "edit" ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedTechnicianId}
                  onChange={(event) => setSelectedTechnicianId(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none focus:border-emerald-400"
                >
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDeleteVisits}
                  disabled={isSaving || !selectedTechnicianId}
                  className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eliminar visitas
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving || !selectedTechnicianId}
                  className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eliminar técnico
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Nombre</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Correo</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                {mode === "create" ? "Clave inicial" : "Nueva clave opcional"}
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Teléfono</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Zona</span>
              <input
                value={form.zone}
                onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Especialidad</span>
              <input
                value={form.specialty}
                onChange={(event) => setForm((current) => ({ ...current, specialty: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSaving || !form.name || !form.email || (mode === "create" && !form.password)}
            className="mt-6 rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : mode === "create" ? "Crear técnico" : "Guardar cambios"}
          </button>
          {mode === "edit" ? (
            <p className="mt-3 text-sm text-slate-400">
              Visitas asignadas actuales: {technicians.find((item) => item.id === selectedTechnicianId)?._count?.assignedVisits ?? 0}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
