import { locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import TeamRegistrationStatus from "@/components/TeamRegistrationStatus";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Trash2, UserMinus, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Account() {
  const { user, team, refreshAuth, logout, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const themesKey = ["account-theme-suggestions", user?.id, user?.teamId];
  const themesQuery = useQuery<Array<{ id: string; themeName: string; popularityScore: number; status: string; createdAt: string | null }>>({
    queryKey: themesKey,
    enabled: !!user?.teamId,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/auth/me/theme-suggestions", { signal });
      if (!response.ok) throw new Error(t("Eroare la obținerea sugestiilor"));
      return response.json();
    },
  });
  const themeSuggestions = user?.teamId ? themesQuery.data ?? [] : [];

  useEffect(() => {
    if (!isLoading && !user) setLocation("/");
  }, [isLoading, user, setLocation]);
  useEffect(() => {
    if (user) {
      setName(user.name); setEmail(user.email); setPhoneNumber(user.phoneNumber || "");
    }
  }, [user?.id]);
  if (isLoading) return <p role="status" className="p-8 text-purple-200">{t("Se încarcă…")}</p>;
  if (!user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setName(data.name); setEmail(data.email); setPhoneNumber(data.phoneNumber || "");
      toast({ title: t("Cont actualizat cu succes!") });
      await refreshAuth();
    } catch (err: any) {
      toast({ title: t("Eroare"), description: t(err.message), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/teams/leave", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: t("Ai părăsit echipa.") });
      await refreshAuth();
    } catch (err: any) {
      toast({ title: t("Eroare"), description: t(err.message), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: t("Cont șters definitiv.") });
      // Deletion already destroys the server session.
      await refreshAuth();
    } catch (err: any) {
      toast({ title: t("Eroare"), description: t(err.message), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-amber-500/30">
      <main className="max-w-2xl mx-auto px-4 py-16">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-purple-400 hover:text-amber-400 transition-colors text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
           {t("Înapoi la Eveniment")} </button>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
           {t("Contul Meu")} </h1>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8 space-y-8">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("Nume")}</Label>
                <Input
                  id="name"
                  autoComplete="nickname"
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-950 border-gray-800 focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("Adresă de email")}</Label>
                <Input
                  id="email"
                  autoComplete="email"
                  maxLength={254}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-950 border-gray-800 focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("Număr de telefon (Opțional)")}</Label>
                <Input
                  id="phone"
                  autoComplete="tel"
                  maxLength={30}
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-gray-950 border-gray-800 focus:border-amber-500"
                  placeholder="07xx xxx xxx"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {isSubmitting ? t("Se salvează...") : t("Salvează Modificările")}
            </Button>
          </form>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">{t("Echipa Ta")}</h3>
            <TeamRegistrationStatus />
            {team ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-950 rounded-lg border border-gray-800 gap-4">
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-sm text-gray-400">
                     {t("Rol:")} {user.role === "TEAM_LEADER" ? t("Căpitan") : t("Membru")}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSubmitting} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400 shrink-0">
                      <UserMinus className="w-4 h-4 mr-2" />
                       {t("Părăsește Echipa")} </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("Ești sigur?")}</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        {user.role === "TEAM_LEADER"
                          ? t("Ești căpitanul echipei. Dacă pleci, cel mai vechi membru va deveni noul căpitan. Dacă ești singurul membru, echipa va fi ștearsă definitiv.")
                          : t("Vei părăsi această echipă și nu vei mai avea acces la progresul ei.")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-gray-700 hover:bg-gray-800 text-white">{t("Anulează")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeaveTeam} className="bg-red-500 hover:bg-red-600 text-white">
                         {t("Confirmă")} </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">{t("Nu ești în nicio echipă în acest moment.")}</p>
            )}
          </div>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">{t("Propuneri Teme (Echipă)")}</h3>
            {user.teamId && themesQuery.isLoading ? <p role="status" className="text-gray-400 text-sm">{t("Se încarcă…")}</p> : user.teamId && themesQuery.isError ? <p role="alert" className="text-amber-200 text-sm">{t("Eroare la obținerea sugestiilor")} <button className="underline" onClick={() => void themesQuery.refetch()}>{t("Reîncearcă")}</button></p> : themeSuggestions.length > 0 ? (
              <div className="space-y-3">
                {[...themeSuggestions]
                  .sort((a: any, b: any) => {
                    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
                    if (a.status !== "PENDING" && b.status === "PENDING") return 1;
                    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dA - dB;
                  })
                  .map((theme: any) => (
                  <div key={theme.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-950 rounded-lg border border-gray-800 gap-4">
                    {theme.status !== "PENDING" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors"
                            disabled={isSubmitting}
                            aria-label={t("Șterge din istoric")}
                            title={t("Șterge din istoric")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("Ești sigur?")}</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                               {t("Acest lucru va șterge tema \"")}{theme.themeName}{t("\" din istoricul propunerilor tale.")} </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-white border-none">{t("Anulează")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                if (isSubmitting) return;
                                setIsSubmitting(true);
                                try {
                                  const response = await fetch(`/api/theme-suggestions/${theme.id}`, { method: "DELETE" });
                                  const data = await response.json();
                                  if (!response.ok) throw new Error(data.message || "Eroare la obținerea sugestiilor");
                                  queryClient.setQueryData(themesKey, themeSuggestions.filter(item => item.id !== theme.id));
                                } catch (error) {
                                  toast({ title: t("Eroare"), description: error instanceof Error ? t(error.message) : t("Eroare de conexiune"), variant: "destructive" });
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                               {t("Șterge")} </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <div className="pr-6">
                      <p className="font-medium">{theme.themeName}</p>
                      <p className="text-xs text-gray-400 mt-1">
                         {t("Scor:")} <strong className="text-amber-400">{theme.popularityScore}</strong> {theme.createdAt ? `• ${new Date(theme.createdAt).toLocaleDateString(locale())}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 mt-2 sm:mt-0">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                        theme.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : theme.status === "REJECTED"
                          ? "bg-red-500/20 text-red-300 border-red-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}>
                        {theme.status === "PENDING" ? t("ÎN AȘTEPTARE") : theme.status === "APPROVED" ? t("ACCEPTAT") : t("RESPINS")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">{t("Echipa ta nu a propus nicio temă încă.")}</p>
            )}
          </div>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">{t("Deconectare")}</h3>
            <p className="text-sm text-gray-400">
               {t("Ieși din contul tău de pe acest dispozitiv.")} </p>
            <Button variant="outline" disabled={isSubmitting} onClick={async () => { setIsSubmitting(true); if (await logout()) setLocation("/"); setIsSubmitting(false); }} className="w-full sm:w-auto text-white border-gray-700 hover:bg-gray-800">
              <LogOut className="w-4 h-4 mr-2" />
               {t("Deconectare")} </Button>
          </div>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-red-400">{t("Ștergere Cont")}</h3>
            <p className="text-sm text-gray-400">
               {t("Vei părăsi automat echipa, iar contul tău va fi șters definitiv.")} </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting} variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                   {t("Șterge Contul")} </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Ești sigur?")}</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                     {t("Acest lucru îți va șterge permanent contul.")} </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-gray-700 hover:bg-gray-800 text-white">{t("Anulează")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600 text-white">
                     {t("Șterge Contul")} </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </main>
    </div>
  );
}
