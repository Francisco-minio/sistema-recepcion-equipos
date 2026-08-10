import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "./lib/api";
import { Layout } from "./components/Layout";
import { LoginScreen } from "./components/LoginScreen";
import { OverviewPanel } from "./components/OverviewPanel";
import { ClientsPanel } from "./components/ClientsPanel";
import { TeamPanel } from "./components/TeamPanel";
import { CalendarBoard } from "./components/CalendarBoard";
import { useStoredSession } from "./hooks/useStoredSession";
import { getMonthEnd, getMonthStart } from "./lib/utils";

export default function App() {
  const queryClient = useQueryClient();
  const { ready, session, setSession } = useStoredSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const calendarRangeStart = getMonthStart(calendarDate);
  const calendarRangeEnd = getMonthEnd(calendarDate);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: (payload) => setSession(payload),
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", session?.token],
    queryFn: () => api.dashboard(session!.token),
    enabled: Boolean(session?.token),
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", session?.token],
    queryFn: () => api.clients(session!.token),
    enabled: Boolean(session?.token),
  });

  const techniciansQuery = useQuery({
    queryKey: ["technicians", session?.token],
    queryFn: () => api.technicians(session!.token),
    enabled: Boolean(session?.token),
  });

  const visitsQuery = useQuery({
    queryKey: ["visits", session?.token, calendarRangeStart.toISOString(), calendarRangeEnd.toISOString()],
    queryFn: () => api.visits(session!.token, calendarRangeStart.toISOString(), calendarRangeEnd.toISOString()),
    enabled: Boolean(session?.token),
  });

  const microsoftStatusQuery = useQuery({
    queryKey: ["microsoft-status", session?.token],
    queryFn: () => api.microsoftStatus(session!.token),
    enabled: Boolean(session?.token && session.user.role === "ADMIN"),
  });

  const createClientMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createClient>[1]) => api.createClient(session!.token, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });

  const createTechnicianMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createTechnician>[1]) => api.createTechnician(session!.token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ technicianId, payload }: { technicianId: string; payload: Parameters<typeof api.updateTechnician>[2] }) =>
      api.updateTechnician(session!.token, technicianId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: (technicianId: string) => api.deleteTechnician(session!.token, technicianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });

  const deleteTechnicianVisitsMutation = useMutation({
    mutationFn: (technicianId: string) => api.deleteTechnicianVisits(session!.token, technicianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createVisit>[1]) => api.createVisit(session!.token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: (visitId: string) => api.deleteVisit(session!.token, visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
  });

  const moveVisitMutation = useMutation({
    mutationFn: ({ visitId, payload }: { visitId: string; payload: Parameters<typeof api.updateVisit>[2] }) =>
      api.updateVisit(session!.token, visitId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const microsoftConnectMutation = useMutation({
    mutationFn: () => api.microsoftConnect(session!.token),
    onSuccess: (payload) => {
      window.location.href = payload.authUrl;
    },
  });

  const microsoftSyncMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.microsoftSync>[1]) => api.microsoftSync(session!.token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["microsoft-status"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const activeError =
    dashboardQuery.error ||
    clientsQuery.error ||
    techniciansQuery.error ||
    visitsQuery.error ||
    microsoftStatusQuery.error ||
    createClientMutation.error ||
    createTechnicianMutation.error ||
    updateTechnicianMutation.error ||
    deleteTechnicianMutation.error ||
    deleteTechnicianVisitsMutation.error ||
    createVisitMutation.error ||
    deleteVisitMutation.error ||
    moveVisitMutation.error ||
    microsoftConnectMutation.error ||
    microsoftSyncMutation.error;

  if (!ready) {
    return <div className="grid min-h-[100dvh] place-items-center text-slate-300">Cargando sesion...</div>;
  }

  if (!session) {
    return <LoginScreen onSubmit={(email, password) => loginMutation.mutateAsync({ email, password }).then(() => undefined)} />;
  }

  const calendarTechnicians =
    session.user.role === "ADMIN"
      ? techniciansQuery.data || []
      : (techniciansQuery.data || []).filter((technician) => technician.id === session.user.id);

  return (
    <Layout
      user={session.user}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={() => setSession(null)}
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Centro de control</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            Operacion tecnica, agenda y clientes
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
            Base migrada a React, API real, persistencia en base de datos y calendario operativo con reprogramacion.
          </p>
        </div>
      </header>

      {activeError instanceof Error ? (
        <div className="mb-6 rounded-[24px] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
          {activeError.message}
        </div>
      ) : null}

      {dashboardQuery.isLoading || clientsQuery.isLoading || techniciansQuery.isLoading || visitsQuery.isLoading ? (
        <div className="rounded-[30px] border border-white/10 bg-white/6 p-8 text-slate-300 backdrop-blur-xl">
          Cargando informacion operativa...
        </div>
      ) : null}

      {activeTab === "overview" && dashboardQuery.data ? <OverviewPanel data={dashboardQuery.data} /> : null}
      {activeTab === "clients" && clientsQuery.data ? (
        <ClientsPanel
          clients={clientsQuery.data}
          role={session.user.role}
          onCreate={(payload) => createClientMutation.mutateAsync(payload as Parameters<typeof api.createClient>[1]).then(() => undefined)}
        />
      ) : null}
      {activeTab === "team" && techniciansQuery.data ? (
        <TeamPanel
          technicians={techniciansQuery.data}
          role={session.user.role}
          onCreate={(payload) => createTechnicianMutation.mutateAsync(payload).then(() => undefined)}
          onUpdate={(technicianId, payload) =>
            updateTechnicianMutation.mutateAsync({ technicianId, payload }).then(() => undefined)
          }
          onDelete={(technicianId) => deleteTechnicianMutation.mutateAsync(technicianId).then(() => undefined)}
          onDeleteVisits={(technicianId) => deleteTechnicianVisitsMutation.mutateAsync(technicianId).then(() => undefined)}
        />
      ) : null}
      {activeTab === "calendar" && techniciansQuery.data && clientsQuery.data && visitsQuery.data ? (
        <CalendarBoard
          role={session.user.role}
          technicians={calendarTechnicians}
          clients={clientsQuery.data}
          visits={visitsQuery.data}
          selectedDate={calendarDate}
          onNavigate={setCalendarDate}
          onCreateVisit={(payload) => createVisitMutation.mutateAsync(payload).then(() => undefined)}
          onMoveVisit={(visitId, payload) => moveVisitMutation.mutateAsync({ visitId, payload }).then(() => undefined)}
          onUpdateVisit={(visitId, payload) => moveVisitMutation.mutateAsync({ visitId, payload }).then(() => undefined)}
          onDeleteVisit={(visitId) => deleteVisitMutation.mutateAsync(visitId).then(() => undefined)}
          microsoftStatus={microsoftStatusQuery.data || null}
          isMicrosoftSyncing={microsoftSyncMutation.isPending}
          lastMicrosoftSyncResult={microsoftSyncMutation.data || null}
          onConnectMicrosoft={() => microsoftConnectMutation.mutateAsync().then(() => undefined)}
          onSyncMicrosoft={(payload) => microsoftSyncMutation.mutateAsync(payload).then(() => undefined)}
          onLoadVisitsRange={(start, end) => api.visits(session.token, start, end)}
        />
      ) : null}
    </Layout>
  );
}
