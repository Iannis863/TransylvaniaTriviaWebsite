import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { t, locale } from "@/lib/i18n";
import type { LeaderboardIdentity } from "@shared/leaderboard";
import { bucharestParts } from "@shared/event-time";

type AdminApi = (method: string, path: string, body?: unknown) => Promise<any>;
interface AdminData {
  identities: LeaderboardIdentity[];
  teams: { id: string; name: string }[];
  seasons: { id: string; startYear: number; number: number; updatedAt: string; editions: number[] }[];
}
interface Preview {
  teams: number; editions: number[]; totalWarnings: number; autoLinked: number;
  rows: { name: string; scores: Record<string, number>; total: number }[];
}
export default function AdminLeaderboard({ api, password }: { api: AdminApi; password: string }) {
  const now = bucharestParts(new Date());
  const [year, setYear] = useState(now.month <= 6 ? now.year - 1 : now.year);
  const [season, setSeason] = useState(now.month <= 6 ? 2 : 1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingLink, setSavingLink] = useState<string | null>(null);
  const active = useRef(true);
  const request = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    try {
      const next = await api("GET", "/api/admin/leaderboard");
      if (active.current && version === request.current) { setData(next); setError(""); }
    } catch (error: any) { if (active.current && version === request.current) setError(error.message); }
    finally { if (active.current && version === request.current) setLoading(false); }
  }, [api]);
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; ++request.current; }; }, [load]);
  const upload = async (publish: boolean) => {
    if (!file || busy || (publish && !preview)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/leaderboard/import?year=${year}&season=${season}${publish ? "" : "&preview=1"}`, {
        method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Admin-Password": password }, body: file,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || t("Clasamentul nu a putut fi salvat."));
      if (!active.current) return;
      if (publish) {
        setPreview(null); setFile(null); if (fileInput.current) fileInput.current.value = "";
        await load();
        await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        if (active.current) setMessage(t("Clasament publicat: {0} echipe, {1} ediții actualizate.", [result.teams, result.editions.length]));
      } else setPreview(result);
    } catch (error: any) { if (active.current) setError(error.message); }
    finally { if (active.current) setBusy(false); }
  };
  const link = async (identity: LeaderboardIdentity, teamId: string) => {
    if (savingLink) return;
    setSavingLink(identity.id); setError(""); setMessage("");
    try {
      const saved = await api("PATCH", `/api/admin/leaderboard/teams/${identity.id}`, { teamId: teamId || null });
      if (!active.current) return;
      setData(previous => previous && ({ ...previous, identities: previous.identities.map(item => item.id === identity.id ? saved : item) }));
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      if (active.current) setMessage(t("Asociere salvată."));
    } catch (error: any) { if (active.current) setError(error.message); }
    finally { if (active.current) setSavingLink(null); }
  };
  const inputClass = "w-full rounded-lg border border-purple-700/50 bg-[#0c0317] px-3 py-2 text-sm text-purple-100 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50";
  const format = (units: number) => (units / 100).toLocaleString(locale(), { maximumFractionDigits: 2 });
  return <div className="mx-auto max-w-5xl space-y-8">
    <div>
      <h2 className="text-xl font-bold text-white">{t("Administrare clasament")}</h2>
      <p className="mt-2 text-sm text-purple-300/80">{t("Încarcă Excel-ul sezonului: Numele echipei, Ediția 1, Ediția 2… și Scor Final. Celulele goale înseamnă fără participare; zero este un scor valid.")}</p>
      <p className="mt-2 text-sm text-purple-300/80">{t("Edițiile din fișier înlocuiesc rezultatele publicate pentru acele ediții. Edițiile absente și celelalte sezoane se păstrează. Numele identice sunt asociate automat la primul import.")}</p>
    </div>
    <div className="rounded-xl border border-purple-800/40 bg-[#120622] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="leaderboard-year" className="mb-1 block text-xs text-purple-300">{t("Anul de început al sezonului")}</label>
          <input id="leaderboard-year" type="number" min="2026" max="2100" value={year} disabled={busy} onChange={event => { setYear(Number(event.target.value)); setPreview(null); }} className={inputClass} />
        </div>
        <div><label htmlFor="admin-leaderboard-season" className="mb-1 block text-xs text-purple-300">{t("Sezon")}</label>
          <select id="admin-leaderboard-season" value={season} disabled={busy} onChange={event => { setSeason(Number(event.target.value)); setPreview(null); }} className={inputClass}>
            <option value={1}>{t("Sezonul 1 · toamnă")}</option><option value={2}>{t("Sezonul 2 · primăvară")}</option>
          </select>
        </div>
      </div>
      <label htmlFor="leaderboard-file" className="mb-1 mt-4 block text-xs text-purple-300">{t("Fișier Excel (.xlsx, maximum 2 MB)")}</label>
      <input ref={fileInput} id="leaderboard-file" type="file" accept=".xlsx" disabled={busy} className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-purple-800 file:px-3 file:py-1 file:text-purple-100`} onChange={event => {
        const selected = event.target.files?.[0] ?? null;
        setPreview(null); setMessage(""); setError("");
        if (selected && (!/\.xlsx$/i.test(selected.name) || selected.size > 2 * 1024 * 1024)) { setError(t("Încarcă un fișier .xlsx de maximum 2 MB.")); setFile(null); }
        else setFile(selected);
      }} />
      <button onClick={() => void upload(false)} disabled={!file || busy || savingLink !== null} className="mt-4 rounded-lg border border-amber-400/50 px-4 py-2 text-sm text-amber-300 disabled:opacity-40">{busy ? t("Se încarcă…") : t("Previzualizează importul")}</button>
      {preview && <div className="mt-6 border-t border-purple-800/50 pt-5">
        <h3 className="font-semibold text-white">{t("Previzualizare: {0} echipe · ediții {1}", [preview.teams, preview.editions.join(", ")])}</h3>
        <p className="mt-2 text-sm text-purple-200">{t("Totalurile sunt calculate din punctele edițiilor. Asocieri automate noi: {0}.", [preview.autoLinked])}</p>
        {!!preview.totalWarnings && <p role="status" className="mt-2 text-sm text-amber-200">{t("{0} totaluri din Excel diferă de suma edițiilor. Se va folosi suma calculată.", [preview.totalWarnings])}</p>}
        <div className="mt-4 max-h-80 overflow-auto" tabIndex={0} role="region" aria-label={t("Previzualizare clasament")}><table className="w-full text-left text-sm">
          <thead className="text-purple-300"><tr><th className="py-2 pr-4">{t("Echipă")}</th>{preview.editions.map(number => <th className="whitespace-nowrap px-3 text-right" key={number}>{t("Ediția {0}", [number])}</th>)}<th className="px-3 text-right">{t("Total")}</th></tr></thead>
          <tbody>{preview.rows.map(row => <tr key={row.name} className="border-t border-purple-800/30"><td className="py-2 pr-4 text-white">{row.name}</td>{preview.editions.map(number => <td className="px-3 text-right text-purple-200" key={number}>{row.scores[number] === undefined ? "—" : format(row.scores[number])}</td>)}<td className="px-3 text-right text-amber-300">{format(row.total)}</td></tr>)}</tbody>
        </table></div>
        <button onClick={() => void upload(true)} disabled={busy || savingLink !== null} className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-purple-950 disabled:opacity-40">{t("Publică acest clasament")}</button>
      </div>}
    </div>
    {error && <p role="alert" className="text-sm text-red-300">{t(error)}</p>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    <div>
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold text-white">{t("Istoric publicat")}</h3><button className="text-sm text-amber-300 disabled:opacity-40" disabled={busy || loading || !!savingLink} onClick={() => void load()}>{t("Reîncarcă")}</button></div>
      {loading && <p role="status" className="text-sm text-purple-300">{t("Se încarcă…")}</p>}
      {data?.seasons.slice().sort((a, b) => b.startYear - a.startYear || b.number - a.number).map(item => <p key={item.id} className="mb-2 text-sm text-purple-200">{t("Sezonul {0} · {1}–{2}", [item.number, item.startYear, item.startYear + 1])} — {t("Ediții: {0}", [item.editions.join(", ")])} · {new Date(item.updatedAt).toLocaleString(locale(), { timeZone: "Europe/Bucharest" })}</p>)}
      {data && !data.seasons.length && <p className="text-sm text-purple-300">{t("Nu există încă rezultate publicate.")}</p>}
    </div>
    <div>
      <h3 className="mb-2 font-semibold text-white">{t("Asociază echipele din clasament")}</h3>
      <p className="mb-4 text-sm text-purple-300/80">{t("Asocierile se păstrează la importurile următoare. Poți asocia nume diferite din sezoane diferite cu aceeași echipă; punctele lor se vor aduna în clasamentul general.")}</p>
      <div className="divide-y divide-purple-800/30">{data?.identities.slice().sort((a, b) => a.name.localeCompare(b.name, locale())).map(identity => <div key={identity.id} className="grid items-center gap-2 py-3 sm:grid-cols-2">
        <label htmlFor={`leaderboard-link-${identity.id}`} className="break-words text-sm text-white">{identity.name}</label>
        <select id={`leaderboard-link-${identity.id}`} value={identity.teamId ?? ""} disabled={busy || !!savingLink} className={inputClass} onChange={event => void link(identity, event.target.value)}>
          <option value="">{t("Fără asociere")}</option>
          {data.teams.slice().sort((a, b) => a.name.localeCompare(b.name, locale())).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </div>)}</div>
    </div>
  </div>;
}
