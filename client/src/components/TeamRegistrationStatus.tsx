import { locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

interface TeamRegistration { id: string; status: "WAITLISTED" | "CONFIRMED"; eventDate: string | null }
export default function TeamRegistrationStatus() {
  const { user, team } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery<TeamRegistration[]>({
    queryKey: ["team-registrations", user?.id, team?.id],
    enabled: !!user && !!team,
    queryFn: async () => {
      const response = await fetch("/api/teams/me/registrations");
      if (!response.ok) throw new Error(t("Statusul înscrierii nu a putut fi încărcat."));
      return response.json();
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["team-registrations"] }); };
    window.addEventListener("registration-updated", refresh);
    return () => window.removeEventListener("registration-updated", refresh);
  }, [queryClient]);
  if (!user || !team) return null;
  const upcoming = (query.data ?? []).filter(r => r.eventDate && new Date(r.eventDate) > new Date()).sort((a, b) => a.eventDate!.localeCompare(b.eventDate!));
  return <div className="mb-6 space-y-3" aria-live="polite">
    <h3 className="text-lg text-amber-300 font-heading">{t("Înscrierile echipei")}</h3>
    {query.isLoading ? <p className="text-purple-300 text-sm">{t("Se verifică înscrierile…")}</p> : query.isError ? <p className="text-amber-200 text-sm">{t("Nu am putut verifica înscrierile.")} <button onClick={() => query.refetch()} className="underline">{t("Reîncearcă")}</button></p> : upcoming.length === 0 ? <p className="text-purple-300 text-sm">{t("Echipa nu este înscrisă la un eveniment viitor.")}</p> : upcoming.map(registration => (
      <div key={registration.id} className="rounded-xl border border-purple-700/50 bg-purple-950/40 p-4">
        <p className="text-sm text-purple-100">{new Date(registration.eventDate!).toLocaleString(locale(), { timeZone: "Europe/Bucharest", dateStyle: "long", timeStyle: "short" })}  {t("· ora României")}</p>
        <p className={`font-semibold mt-1 ${registration.status === "WAITLISTED" ? "text-amber-300" : "text-emerald-300"}`}>
          {registration.status === "WAITLISTED" ? t("Pe lista de așteptare · loc neconfirmat") : t("Acceptată · loc confirmat")}
        </p>
        {registration.status === "WAITLISTED" && <p className="text-xs text-purple-300 mt-1">{t("Quizmasterul verifică locurile disponibile. Primiți un email dacă echipa este acceptată.")}</p>}
      </div>
    ))}
  </div>;
}
