import { useState } from "react";
import { useLeaderboard } from "@/lib/leaderboard";
import { Trophy } from "lucide-react";
import { t, locale, useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { leaderboardScoreKey, type PublicLeaderboard } from "@shared/leaderboard";

export default function LeaderboardSection() {
  useLanguage();
  const { team } = useAuth();
  const [seasonId, setSeasonId] = useState("all");
  const [edition, setEdition] = useState("all");
  const query = useLeaderboard();
  const data = query.data;
  const season = data?.seasons.find(item => item.id === seasonId);
  const selectedSeason = season ? seasonId : "all";
  const selectedEdition = season?.editions.some(item => String(item.number) === edition) ? edition : "all";
  const format = (units: number) => (units / 100).toLocaleString(locale(), { maximumFractionDigits: 2 });
  const label = (item: PublicLeaderboard["seasons"][number]) => t("Sezonul {0} · {1}–{2}", [item.number, item.startYear, item.startYear + 1]);
  const columns = season
    ? season.editions.filter(item => selectedEdition === "all" || String(item.number) === selectedEdition).map(item => ({ id: leaderboardScoreKey(season.id, item.number), label: t("Ediția {0}", [item.number]), keys: [leaderboardScoreKey(season.id, item.number)] }))
    : (data?.seasons ?? []).slice().reverse().map(item => ({ id: item.id, label: label(item), keys: item.editions.map(edition => leaderboardScoreKey(item.id, edition.number)) }));
  const rows = (data?.rows ?? []).map(row => {
    const keys = columns.flatMap(column => column.keys);
    return { ...row, visibleTotal: keys.reduce((sum, key) => sum + (row.scores[key] ?? 0), 0), participates: keys.some(key => row.scores[key] !== undefined) };
  }).filter(row => row.participates).sort((a, b) => b.visibleTotal - a.visibleTotal || a.name.localeCompare(b.name, locale()));
  const control = "w-full sm:w-auto max-w-full rounded-lg border border-purple-700/60 bg-[#170a28] px-3 py-2.5 text-sm text-purple-100 focus:outline-none focus:ring-2 focus:ring-amber-400";
  return (
    <section id="leaderboard" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-amber-400" aria-hidden />
          <h2 className="font-heading text-3xl tracking-widest text-gold-gradient sm:text-5xl">{t("CLASAMENT")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-purple-200/80">{t("Rezultatele fiecărei ediții, istoricul sezoanelor și punctele adunate de echipe.")}</p>
        </div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0"><label className="mb-1 block text-xs text-purple-300" htmlFor="leaderboard-season">{t("Sezon")}</label>
            <select id="leaderboard-season" className={control} value={selectedSeason} onChange={event => { setSeasonId(event.target.value); setEdition("all"); }}>
              <option value="all">{t("General · toate sezoanele")}</option>
              {data?.seasons.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}
            </select>
          </div>
          {season && <div><label className="mb-1 block text-xs text-purple-300" htmlFor="leaderboard-edition">{t("Ediție")}</label>
            <select id="leaderboard-edition" className={control} value={selectedEdition} onChange={event => setEdition(event.target.value)}>
              <option value="all">{t("Total sezon")}</option>
              {season.editions.map(item => <option key={item.number} value={item.number}>{t("Ediția {0}", [item.number])} · {new Date(item.eventDate).toLocaleDateString(locale(), { timeZone: "Europe/Bucharest", day: "numeric", month: "short" })}</option>)}
            </select>
          </div>}
          {season && <p className="text-xs text-purple-300/60 sm:ml-auto">{t("Actualizat: {0}", [new Date(season.updatedAt).toLocaleDateString(locale(), { timeZone: "Europe/Bucharest" })])}</p>}
        </div>
        {query.isPending && <p role="status" className="py-10 text-center text-purple-200">{t("Se încarcă…")}</p>}
        {query.isError && <p role="alert" className="mb-4 text-center text-amber-200">{t("Clasamentul nu a putut fi încărcat.")} <button className="underline" onClick={() => void query.refetch()}>{t("Reîncearcă")}</button></p>}
        {data && !data.seasons.length && <p className="rounded-2xl border border-purple-800/40 px-6 py-12 text-center text-purple-200/80">{t("Rezultatele vor apărea aici după publicarea primului clasament.")}</p>}
        {!!data?.seasons.length && <div className="overflow-x-auto rounded-2xl border border-purple-700/40 bg-[#10051e]" tabIndex={0} role="region" aria-label={t("Tabel clasament")}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{season ? label(season) : t("General · toate sezoanele")}{selectedEdition !== "all" ? ` · ${t("Ediția {0}", [selectedEdition])}` : ""}</caption>
            <thead className="border-b border-purple-700/40 bg-purple-950/50 text-xs text-purple-300"><tr>
              <th scope="col" className="px-4 py-4">{t("Loc")}</th><th scope="col" className="min-w-44 px-4 py-4">{t("Echipă")}</th>
              {columns.map(column => <th scope="col" key={column.id} className="whitespace-nowrap px-4 py-4 text-right">{column.label}</th>)}
              <th scope="col" className="px-4 py-4 text-right text-amber-300">{t("Total")}</th>
            </tr></thead>
            <tbody>{rows.map(row => {
              const rank = rows.findIndex(item => item.visibleTotal === row.visibleTotal) + 1;
              const own = row.teamId === team?.id;
              return <tr key={row.id} className={`border-b border-purple-800/25 last:border-0 ${own ? "bg-amber-400/10" : "hover:bg-purple-900/20"}`}>
                <td className={`px-4 py-4 font-semibold ${rank <= 3 ? "text-amber-300" : "text-purple-300"}`}>{rank}</td>
                <th scope="row" className="px-4 py-4 font-medium text-purple-50">{row.name}{own && <span className="mt-1 block text-xs text-amber-300">{t("Echipa ta")}</span>}</th>
                {columns.map(column => <td key={column.id} className="px-4 py-4 text-right tabular-nums text-purple-200">{column.keys.some(key => row.scores[key] !== undefined) ? format(column.keys.reduce((sum, key) => sum + (row.scores[key] ?? 0), 0)) : "—"}</td>)}
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-amber-300">{format(row.visibleTotal)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>}
        {!!data?.seasons.length && <p className="mt-3 text-xs text-purple-300/60">{t("Totalul general adună toate edițiile publicate. — înseamnă fără participare; echipele la egalitate împart același loc.")}</p>}
      </div>
    </section>
  );
}
