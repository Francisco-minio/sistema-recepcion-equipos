import { CalendarDots, SignOut, Buildings, UsersThree, Gauge } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { Role, User } from "../types";
import { cn } from "../lib/utils";

type Props = {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  children: ReactNode;
};

const tabs: Array<{ id: string; label: string; icon: ReactNode; roles?: Role[] }> = [
  { id: "overview", label: "Dashboard", icon: <Gauge size={18} weight="bold" /> },
  { id: "calendar", label: "Calendario", icon: <CalendarDots size={18} weight="bold" /> },
  { id: "clients", label: "Clientes", icon: <Buildings size={18} weight="bold" /> },
  { id: "team", label: "Tecnicos", icon: <UsersThree size={18} weight="bold" /> },
];

export function Layout({ user, activeTab, onTabChange, onLogout, children }: Props) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[300px_1fr]">
      <aside className="flex flex-col justify-between border-b border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl lg:border-b-0 lg:border-r">
        <div>
          <div className="mb-8 flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-slate-950">S</div>
            <div>
              <p className="font-semibold text-white">ServiceHub TI</p>
              <p className="text-sm text-slate-400">Agenda y operacion</p>
            </div>
          </div>
          <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">{user.role}</p>
            <p className="mt-2 text-xl font-semibold text-white">{user.name}</p>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
          </div>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition",
                  activeTab === tab.id
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-white/4 text-slate-300 hover:bg-white/8",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-300 transition hover:bg-white/10"
        >
          <SignOut size={18} weight="bold" />
          Cerrar sesion
        </button>
      </aside>
      <main className="px-4 py-5 md:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
