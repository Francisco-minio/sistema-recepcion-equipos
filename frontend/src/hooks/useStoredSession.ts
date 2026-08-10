import { useEffect, useState } from "react";
import type { User } from "../types";

const STORAGE_KEY = "servicehub-session";

type Session = {
  token: string;
  user: User;
};

export function useStoredSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setSession(JSON.parse(raw));
    }
    setReady(true);
  }, []);

  const persist = (nextSession: Session | null) => {
    setSession(nextSession);
    if (nextSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    ready,
    session,
    setSession: persist,
  };
}
