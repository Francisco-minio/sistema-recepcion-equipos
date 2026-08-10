import { FormEvent, useState } from "react";
import type { Client, Role } from "../types";

type Props = {
  clients: Client[];
  role: Role;
  onCreate: (payload: Omit<Client, "id" | "_count">) => Promise<void>;
};

export function ClientsPanel({ clients, role, onCreate }: Props) {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate(form);
    setForm({ name: "", contact: "", email: "", phone: "", address: "", notes: "" });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[30px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Clientes</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Ficha comercial y operativa</h2>
        <div className="mt-6 space-y-3">
          {clients.map((client) => (
            <article key={client.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-white">{client.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {client.contact} · {client.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{client.phone}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{client.address}</p>
                  {client.notes ? <p className="mt-3 text-sm leading-7 text-slate-500">{client.notes}</p> : null}
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
                  {client._count?.visits ?? 0} visitas
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.22em] text-amber-300">Registro</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Nuevo cliente</h2>
        {role !== "ADMIN" ? (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-400">
            Solo un administrador puede crear clientes nuevos.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {[
              ["Empresa", "name"],
              ["Contacto", "contact"],
              ["Correo", "email"],
              ["Telefono", "phone"],
              ["Direccion", "address"],
            ].map(([label, key]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-sm text-slate-300">{label}</span>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Notas</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
              />
            </label>
            <button className="rounded-full bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-200">
              Guardar cliente
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
