import { locale } from "@/lib/i18n";
import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { EMAIL_LOGO_PATH, EMAIL_LOGO_URL } from "@shared/email-brand";

interface Payload { to: string; subject: string; html: string; text: string }
interface Delivery { id: string; kind: string; payload: Payload; eventDate: string; sentAt: string | null; cancelledAt: string | null; lastAttemptAt: string | null; lastError: string | null }
interface EmailData {
  from: string; provider: string; configured: boolean;
  templates: { kind: string; audience: string; payload: Payload }[];
  deliveries: Delivery[];
}
const labels: Record<string, string> = { confirmation: "Confirmare / acceptare", waitlist: "Listă de așteptare", reminder: "Memento", "password-reset": "Resetare parolă" };
const date = (value: string | null) => value ? new Date(value).toLocaleString(locale(), { timeZone: "Europe/Bucharest" }) : "—";
export default function AdminEmails({ api }: { api: (method: string, path: string, body?: unknown) => Promise<any> }) {
  const language = useLanguage();
  const [data, setData] = useState<EmailData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("template:0");
  const load = async () => {
    setLoading(true); setError("");
    try { setData(await api("GET", `/api/admin/emails?language=${language}`)); }
    catch (error) { setError(error instanceof Error ? error.message : t("Emailurile nu au putut fi încărcate.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [api, language]);
  const payload = selected.startsWith("template:") ? data?.templates[Number(selected.split(":")[1])]?.payload : data?.deliveries.find(item => item.id === selected)?.payload;
  // Use the identical local asset before deployment; outbound messages retain the public HTTPS URL.
  const previewLogoUrl = `${window.location.origin}${EMAIL_LOGO_PATH}`;
  const previewHtml = payload?.html.replaceAll(`src="${EMAIL_LOGO_URL}"`, `src="${previewLogoUrl}"`);
  return <div className="space-y-6 text-sm text-purple-200">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-heading text-amber-300">{t("Emailuri automate")}</h2>
      <button className="underline text-amber-300 disabled:opacity-50" disabled={loading} onClick={load}>{loading ? t("Se încarcă…") : t("Reîncarcă emailurile")}</button>
    </div>
    {error && <p role="alert" className="text-red-300">{t(error)}</p>}
    {data && <>
      <div className="rounded-xl border border-purple-700/50 p-4 space-y-2">
        <p><strong>{t("Furnizor:")}</strong> {data.provider} · <strong>{t("Expeditor:")}</strong> {data.from}</p>
        <p className={data.configured ? "text-purple-200" : "text-amber-300"}>{data.configured ? t("Cheia Resend este configurată. Verificarea domeniului și a DNS-ului trebuie confirmată în Resend; prezența cheii nu dovedește livrarea.") : t("Cheia Resend lipsește în acest mediu. Emailurile pentru evenimente rămân în așteptare; nimic nu este marcat ca trimis.")}</p>
        <p>{t("Previzualizările folosesc exact șabloanele aplicației, cu nume și cod demonstrative. Nu trimit emailuri. Afișarea finală poate varia între aplicațiile de email.")}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-purple-800/50">
        <table className="w-full text-left"><thead className="bg-purple-950/60"><tr><th className="p-3">Email</th><th className="p-3">{t("Când se trimite")}</th><th className="p-3">{t("Cui")}</th></tr></thead>
          <tbody className="divide-y divide-purple-800/40">
            <tr><td className="p-3">{t("Confirmare / acceptare")}</td><td className="p-3">{t("La înscrierea cu loc confirmat sau când quizmasterul acceptă echipa de pe lista de așteptare.")}</td><td className="p-3" rowSpan={3}>{t("Căpitanului și membrilor cu cont din echipă, fiecare cu numele său. Pentru o echipă fără conturi: doar contactului din formular.")}</td></tr>
            <tr><td className="p-3">{t("Listă de așteptare")}</td><td className="p-3">{t("La înscrierea fără loc disponibil. Spune explicit că locul nu este confirmat.")}</td></tr>
            <tr><td className="p-3">{t("Memento")}</td><td className="p-3">{t("Doar echipelor confirmate, în ziua evenimentului, după 12:00 și înainte de începere, ora României.")}</td></tr>
            <tr><td className="p-3">{t("Resetare parolă")}</td><td className="p-3">{t("Imediat după solicitarea utilizatorului; codul expiră în 10 minute. Nu intră în coada de retrimitere.")}</td><td className="p-3">{t("Adresei contului.")}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-purple-300/80">{t("Pe Vercel Hobby, procesarea automată și reîncercările rulează zilnic prin cron la 10:00 UTC (12:00 iarna / 13:00 vara în România, cu variația de pornire a platformei). Înscrierile și acceptările verifică imediat și reminderul din acea zi. Local, verificarea rulează la 5 minute. Emailurile pentru evenimente trecute nu se mai trimit.")}</p>
      <label className="block space-y-2"><span className="font-semibold">{t("Șablon demonstrativ")}</span>
        <select value={selected.startsWith("template:") ? selected : ""} onChange={e => setSelected(e.target.value)} className="w-full p-3 rounded-lg bg-purple-950 border border-purple-700 text-white">
          <option value="" disabled>{t("Alege un șablon")}</option>
          {data.templates.map((item, index) => <option key={index} value={`template:${index}`}>{t(labels[item.kind])} · {t(item.audience)}</option>)}
        </select>
      </label>
      {payload && <div className="space-y-3 rounded-xl border border-purple-700/50 p-4">
        <p className="text-amber-300 font-semibold">{selected.startsWith("template:") ? t("Exemplu de email") : t("Conținutul exact salvat pentru acest destinatar")}</p>
        <p><strong>{t("Către:")}</strong> {payload.to}</p><p><strong>{t("Subiect:")}</strong> {payload.subject}</p>
        <iframe title={t("Previzualizare email HTML")} sandbox="" referrerPolicy="no-referrer" className="w-full h-[640px] rounded-lg bg-[#09040e]" srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${previewLogoUrl}"></head><body style="margin:0;padding:0;">${previewHtml}</body></html>`} />
        <details><summary className="cursor-pointer text-amber-300">{t("Versiunea text")}</summary><pre className="whitespace-pre-wrap break-words mt-3 text-xs">{payload.text}</pre></details>
      </div>}
      <div className="space-y-2">
        <h3 className="font-semibold text-amber-300">{t("Ultimele 200 de emailuri pentru evenimente")}</h3>
        <p className="text-xs text-purple-300">{t("„Acceptat de Resend” confirmă acceptarea de către furnizor, nu livrarea în inbox. Codurile reale de resetare a parolei nu sunt afișate aici. Datele sunt în ora României.")}</p>
        {data.deliveries.length === 0 ? <p>{t("Niciun email de eveniment înregistrat încă.")}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">{t("Destinatar / tip")}</th><th className="p-2">Status</th><th className="p-2">{t("Ultima încercare")}</th><th className="p-2">{t("Acceptat de furnizor")}</th><th className="p-2">{t("Conținut")}</th></tr></thead><tbody>
          {data.deliveries.map(item => <tr key={item.id} className="border-t border-purple-800/40">
            <td className="p-2">{item.payload.to}<br />{t(labels[item.kind])}</td>
            <td className="p-2">{item.sentAt ? t("Acceptat de Resend") : item.cancelledAt ? t("Anulat (status schimbat)") : new Date(item.eventDate) <= new Date() ? t("Expirat (eveniment început)") : t("În așteptare")}{item.lastError && <p className="text-amber-300 mt-1">{item.lastError}</p>}</td>
            <td className="p-2">{date(item.lastAttemptAt)}</td><td className="p-2">{date(item.sentAt)}</td>
            <td className="p-2"><button onClick={() => setSelected(item.id)} className="underline text-amber-300">{t("Vezi emailul")}</button></td>
          </tr>)}
        </tbody></table></div>}
      </div>
    </>}
  </div>;
}
