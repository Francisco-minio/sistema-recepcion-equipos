import { ShieldCheck, UserCircle } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";

type Props = {
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function LoginScreen({ onSubmit }: Props) {
  const [email, setEmail] = useState("admin@servicehub.local");
  const [password, setPassword] = useState("admin123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(email, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible iniciar sesion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-slate-200 backdrop-blur">
            <ShieldCheck size={18} weight="bold" />
            Operacion TI con agenda persistente y control por roles
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl">
              Gestiona terreno, clientes y recurrencias desde una sola cabina operativa.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              ServiceHub TI centraliza visitas, tecnicos, clientes y agenda semanal con una interfaz
              hecha para equipos de soporte que necesitan claridad, velocidad y control.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Calendario semanal", "Drag and drop por tecnico y por bloque horario."],
              ["Persistencia real", "SQLite + Prisma para dejar atras los datos mock."],
              ["Seguridad operativa", "Autenticacion JWT con roles admin y tecnico."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
                <p className="mb-2 text-sm uppercase tracking-[0.22em] text-emerald-300">{title}</p>
                <p className="text-sm leading-7 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center px-6 py-10 lg:px-12">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/55 p-8 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/12 p-3 text-amber-200">
              <UserCircle size={28} weight="duotone" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Acceso seguro</p>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Iniciar sesion</h2>
            </div>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Correo</span>
              <input
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Contrasena</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {submitting ? "Ingresando..." : "Entrar al dashboard"}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/4 p-4 text-sm text-slate-300">
            <p className="mb-2 font-medium text-white">Credenciales demo</p>
            <p>Admin: `admin@servicehub.local` / `admin123`</p>
            <p>Tecnico: `camila@servicehub.local` / `tecnico123`</p>
          </div>
        </form>
      </section>
    </div>
  );
}
