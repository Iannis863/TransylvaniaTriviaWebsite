import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "TEAM_LEADER" | "MEMBER" | "ADMIN";
  avatar?: string;
  teamId?: string | null;
}

export interface TeamData {
  id: string;
  name: string;
  leaderId: string;
  inviteCode: string;
  tagline?: string;
  score: number;
}

interface AuthContextType {
  user: AuthUser | null;
  team: TeamData | null;
  teamMembers: AuthUser[];
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  loginGoogle: (name: string, email: string) => Promise<boolean>;
  register: (name: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  createTeam: (name: string, tagline?: string) => Promise<boolean>;
  joinTeam: (inviteCode: string) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [teamMembers, setTeamMembers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const refreshAuth = async () => {
    try {
      const storedUserId = localStorage.getItem("tt_user_id") || "usr_vlad_leader";
      const res = await fetch("/api/auth/me", {
        headers: { "x-user-id": storedUserId },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setTeam(data.team);
        setTeamMembers(data.members || []);
      }
    } catch (err) {
      console.error("Auth refresh error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (email: string, password: string = "password123"): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Eroare autentificare", description: data.message || "Email sau parolă greșită", variant: "destructive" });
        return false;
      }
      setUser(data.user);
      setTeam(data.team);
      localStorage.setItem("tt_user_id", data.user.id);
      toast({ title: `Bine ai revenit, ${data.user.name}!`, description: "Te-ai autentificat cu succes." });
      await refreshAuth();
      return true;
    } catch (err) {
      toast({ title: "Eroare", description: "Nu s-a putut realiza conexiunea", variant: "destructive" });
      return false;
    }
  };

  const loginGoogle = async (name: string, email: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, avatar: "🦅" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Eroare Google Auth", description: data.message, variant: "destructive" });
        return false;
      }
      setUser(data.user);
      setTeam(data.team);
      localStorage.setItem("tt_user_id", data.user.id);
      toast({ title: `Autentificat cu Google!`, description: `Salut, ${data.user.name}!` });
      await refreshAuth();
      return true;
    } catch (err) {
      toast({ title: "Eroare", description: "Eroare la autentificarea Google", variant: "destructive" });
      return false;
    }
  };

  const register = async (name: string, email: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: password || "password123", role: "MEMBER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Eroare înregistrare", description: data.message, variant: "destructive" });
        return false;
      }
      setUser(data);
      localStorage.setItem("tt_user_id", data.id);
      toast({ title: "Cont creat cu succes!", description: "Bine ai venit în Transilvania Trivia." });
      await refreshAuth();
      return true;
    } catch (err) {
      toast({ title: "Eroare", description: "Eroare la crearea contului", variant: "destructive" });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setTeam(null);
    setTeamMembers([]);
    localStorage.removeItem("tt_user_id");
    toast({ title: "Deconectat", description: "Ai ieșit din cont." });
  };

  const createTeam = async (name: string, tagline?: string): Promise<boolean> => {
    if (!user) {
      toast({ title: "Autentificare necesară", description: "Trebuie să fii autentificat pentru a crea o echipă.", variant: "destructive" });
      return false;
    }
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, leaderId: user.id, tagline }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Eroare creare echipă", description: data.message, variant: "destructive" });
        return false;
      }
      setTeam(data);
      toast({ title: `Echipa "${data.name}" a fost creată!`, description: `Codul tău de invitație este: ${data.inviteCode}` });
      await refreshAuth();
      return true;
    } catch (err) {
      toast({ title: "Eroare", description: "Nu s-a putut crea echipa", variant: "destructive" });
      return false;
    }
  };

  const joinTeam = async (inviteCode: string): Promise<boolean> => {
    if (!user) {
      toast({ title: "Autentificare necesară", description: "Trebuie să fii conectat pentru a te alătura unei echipe.", variant: "destructive" });
      return false;
    }
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim(), userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Nu s-a putut intra în echipă", description: data.message, variant: "destructive" });
        return false;
      }
      setTeam(data.team);
      setTeamMembers(data.members || []);
      toast({ title: `Te-ai alăturat echipei "${data.team.name}"!`, description: "Acum poți participa împreună cu coechipierii tăi." });
      await refreshAuth();
      return true;
    } catch (err) {
      toast({ title: "Eroare", description: "Eroare la procesarea codului de invitație", variant: "destructive" });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        team,
        teamMembers,
        isLoading,
        login,
        loginGoogle,
        register,
        logout,
        createTeam,
        joinTeam,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
