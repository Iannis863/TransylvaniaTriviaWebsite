import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, ChevronDown, ChevronUp, Copy, Edit2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { locale, t } from "@/lib/i18n";
import {
  bucharestDateTimeInput, bucharestInputToISO, CUSTOM_EVENT_DEFAULTS, CUSTOM_EVENT_DEFAULT_PRIZES,
  CUSTOM_EVENT_LOGO_MAX_BYTES, customEventInputSchema,
  type CustomEventAdminView, type CustomEventInput, type CustomEventPrizes,
} from "@shared/custom-events";

type AdminApi = (method: string, path: string, body?: unknown) => Promise<any>;
type Registration = CustomEventAdminView["registrations"][number];
type EventDraft = Omit<CustomEventInput, "eventDate" | "maxTeams" | "prizes" | "isCollaboration" | "collaboratorName"> & {
  eventDateLocal: string; maxTeams: string; prizes: CustomEventPrizes; isCollaboration: boolean; collaboratorName: string;
};
type RegistrationDraft = Pick<Registration, "teamName" | "captainName" | "email" | "memberCount"> & { phoneNumber: string };
const inputClass = "w-full min-w-0 rounded-lg border border-purple-700/50 bg-[#0c0317] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-purple-700/50 px-3 py-2 text-sm text-purple-200 transition-colors hover:border-amber-400/60 hover:text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-40 disabled:cursor-not-allowed";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-purple-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-40 disabled:cursor-not-allowed";
const fieldLabels: Record<string, string> = {
  name: "Nume eveniment", slug: "Adresă pagină", title: "Titlu pagină", subtitle: "Subtitlu pagină",
  eventDate: "Data și ora (România)", venue: "Locație", address: "Adresă locație", feeLabel: "Taxă", maxTeams: "Număr maxim de echipe",
  prizes: "Premii", isCollaboration: "Eveniment în colaborare", collaboratorName: "Nume colaborator", collaboratorLogoData: "Logo colaborator",
};
function eventInput(event: CustomEventAdminView): Omit<EventDraft, "eventDateLocal" | "maxTeams"> & { eventDate: string; maxTeams: number } {
  return { name: event.name, slug: event.slug, title: event.title, subtitle: event.subtitle, eventDate: event.eventDate,
    venue: event.venue, address: event.address, feeLabel: event.feeLabel, maxTeams: event.maxTeams,
    isPublished: event.isPublished, registrationOpen: event.registrationOpen, prizes: event.prizes,
    isCollaboration: event.isCollaboration, collaboratorName: event.collaboratorName };
}
function emptyDraft(): EventDraft {
  return { name: "", slug: "", title: "", subtitle: "", eventDateLocal: `${bucharestDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)).slice(0, 10)}T20:00`,
    ...CUSTOM_EVENT_DEFAULTS, maxTeams: String(CUSTOM_EVENT_DEFAULTS.maxTeams), isPublished: false, registrationOpen: true,
    prizes: structuredClone(CUSTOM_EVENT_DEFAULT_PRIZES), isCollaboration: false, collaboratorName: "" };
}
function suggestedSlug(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
}

export default function AdminCustomEvents({ api }: { api: AdminApi }) {
  const [events, setEvents] = useState<CustomEventAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CustomEventAdminView | "new" | null>(null);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [titleEdited, setTitleEdited] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [registrationDraft, setRegistrationDraft] = useState<RegistrationDraft>({ teamName: "", captainName: "", email: "", phoneNumber: "", memberCount: 1 });
  const [confirm, setConfirm] = useState<{ event?: CustomEventAdminView; registration?: Registration } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const active = useRef(true);
  const latestLoad = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const logoRequestVersion = useRef(0);
  const logoReader = useRef<FileReader | null>(null);
  const logoFileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const load = useCallback(async () => {
    const request = ++latestLoad.current;
    setLoading(true);
    try {
      const result = await api("GET", "/api/admin/custom-events") as CustomEventAdminView[];
      if (active.current && request === latestLoad.current) { setEvents(result); setError(""); }
    } catch (failure) {
      if (active.current && request === latestLoad.current) setError(failure instanceof Error ? failure.message : t("Evenimentele nu au putut fi încărcate."));
    } finally { if (active.current && request === latestLoad.current) setLoading(false); }
  }, [api]);
  useEffect(() => { active.current = true; void load(); return () => {
    active.current = false; ++latestLoad.current; ++logoRequestVersion.current; logoReader.current?.abort(); clearTimeout(copyTimer.current);
  }; }, [load]);
  const invalidatePublic = () => queryClient.invalidateQueries({ predicate: query => query.queryKey[0] === "custom-event" || query.queryKey[0] === "custom-events" || query.queryKey[0] === "team-registrations" });
  const mutate = async (operation: () => Promise<unknown>, success: string, closeEditor?: () => void) => {
    if (busy) return;
    setBusy(true); setError(""); setFormError(""); setMessage("");
    try {
      await operation();
      if (!active.current) return;
      closeEditor?.();
      setMessage(t(success));
      await load();
      await invalidatePublic();
    } catch (failure) {
      if (active.current) {
        const text = failure instanceof Error ? failure.message : t("Eroare server");
        if (editingEvent || editingRegistration) setFormError(text); else setError(text);
      }
    } finally { if (active.current) setBusy(false); }
  };
  const closeEventEditor = () => {
    ++logoRequestVersion.current; logoReader.current?.abort(); setLogoLoading(false); setEditingEvent(null);
  };
  const loadLogo = (event: CustomEventAdminView) => {
    const request = ++logoRequestVersion.current;
    logoReader.current?.abort(); setLogoLoading(true); setLogoLoadFailed(false);
    void api("GET", `/api/admin/custom-events/${event.id}/collaborator-logo`).then((result: { dataUrl: string | null }) => {
      if (active.current && request === logoRequestVersion.current) { setLogoPreview(result.dataUrl); setLogoLoading(false); }
    }).catch(failure => {
      if (active.current && request === logoRequestVersion.current) {
        setFormError(failure instanceof Error ? failure.message : t("Logoul colaboratorului nu a putut fi încărcat."));
        setLogoLoading(false); setLogoLoadFailed(true);
      }
    });
  };
  const openEditor = (event?: CustomEventAdminView) => {
    ++logoRequestVersion.current; logoReader.current?.abort(); setLogoPreview(null); setLogoLoading(false); setLogoLoadFailed(false);
    setFormError(""); setSlugEdited(!!event); setTitleEdited(!!event);
    if (event) {
      const { eventDate, maxTeams, ...fields } = eventInput(event);
      setDraft({ ...fields, maxTeams: String(maxTeams), eventDateLocal: bucharestDateTimeInput(eventDate) });
      setEditingEvent(event);
      loadLogo(event);
    } else { setDraft(emptyDraft()); setEditingEvent("new"); }
  };
  const saveEvent = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || logoLoading || !editingEvent) return;
    if (draft.isCollaboration && (!draft.collaboratorName.trim() || !logoPreview)) {
      setFormError(t("Pentru un eveniment în colaborare, completează numele colaboratorului și încarcă un logo PNG."));
      return;
    }
    try {
      const { eventDateLocal, maxTeams, ...fields } = draft;
      const parsed = customEventInputSchema.safeParse({ ...fields, eventDate: bucharestInputToISO(eventDateLocal), maxTeams: Number(maxTeams) });
      if (!parsed.success) {
        const field = String(parsed.error.issues[0]?.path[0] ?? "");
        setFormError(field === "slug" ? t("Adresa paginii trebuie să fie unică, să conțină 2–60 de litere mici, cifre sau cratime și să nu fie o adresă rezervată.")
          : t("Verifică acest câmp: {0}.", [t(fieldLabels[field] ?? field)]));
        return;
      }
      const current = editingEvent;
      void mutate(() => api(current === "new" ? "POST" : "PATCH", `/api/admin/custom-events${current === "new" ? "" : `/${current.id}`}`, parsed.data), "Eveniment salvat.", closeEventEditor);
    } catch (failure) { setFormError(failure instanceof Error ? failure.message : t("Introdu o dată și o oră valide.")); }
  };
  const selectLogo = async (file: File | undefined) => {
    if (!file || busy) return;
    const request = ++logoRequestVersion.current;
    logoReader.current?.abort(); setFormError(""); setLogoLoading(true); setLogoLoadFailed(false);
    try {
      if (file.size > CUSTOM_EVENT_LOGO_MAX_BYTES) throw new Error(t("Logoul trebuie să fie un fișier PNG de maximum 1 MB."));
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      if (bytes.length !== 8 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) throw new Error(t("Logoul trebuie să fie un fișier PNG de maximum 1 MB."));
      if (!active.current || request !== logoRequestVersion.current) return;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); logoReader.current = reader;
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.replace(/^data:[^;]*;base64,/, "data:image/png;base64,")) : reject(new Error(t("Logoul nu a putut fi citit.")));
        reader.onerror = () => reject(new Error(t("Logoul nu a putut fi citit.")));
        reader.onabort = () => reject(new Error("FILE_READ_CANCELLED"));
        reader.readAsDataURL(file);
      });
      if (active.current && request === logoRequestVersion.current) {
        setDraft(value => ({ ...value, collaboratorLogoData: dataUrl })); setLogoPreview(dataUrl);
      }
    } catch (failure) {
      if (active.current && request === logoRequestVersion.current) {
        setFormError(failure instanceof Error ? failure.message : t("Logoul nu a putut fi citit."));
        if (logoFileInput.current) logoFileInput.current.value = "";
      }
    } finally { if (active.current && request === logoRequestVersion.current) setLogoLoading(false); }
  };
  const removeLogo = () => {
    ++logoRequestVersion.current; logoReader.current?.abort(); setLogoLoading(false); setLogoLoadFailed(false); setLogoPreview(null);
    setDraft(value => ({ ...value, collaboratorLogoData: null }));
    if (logoFileInput.current) logoFileInput.current.value = "";
  };
  const copyLink = async (event: CustomEventAdminView) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${event.slug}`);
      if (active.current) {
        setCopiedId(event.id); clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopiedId(null), 2000);
      }
    } catch { setError(t("Linkul nu a putut fi copiat. Îl poți selecta din adresa afișată.")); }
  };
  const saveRegistration = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRegistration || busy) return;
    void mutate(() => api("PATCH", `/api/admin/registrations/${editingRegistration.id}`, registrationDraft), "Înscriere actualizată.", () => setEditingRegistration(null));
  };
  const dateLabel = (value: string) => new Date(value).toLocaleString(locale(), { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl"><h2 className="text-xl font-bold text-white">{t("Evenimente speciale")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-purple-300/80">{t("Creează o pagină separată pentru fiecare eveniment, cu propriile detalii și înscrieri. Capacitatea rămâne exact cea setată de tine; echipele în așteptare sunt acceptate manual.")}</p>
      </div>
      <button onClick={() => openEditor()} disabled={busy} className={primaryButton}><Plus className="h-4 w-4" />{t("Creează eveniment")}</button>
    </div>
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-purple-300">{t("Toate datele și orele sunt în fusul orar al României.")}</p>
      <button onClick={() => void load()} disabled={busy || loading} className="shrink-0 text-sm text-amber-300 disabled:opacity-40">{t("Reîncarcă")}</button></div>
    {error && <p role="alert" className="text-sm text-red-300">{t(error)}</p>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    {loading && <p role="status" className="py-4 text-sm text-purple-300">{t("Se încarcă…")}</p>}
    {!loading && !error && !events.length && <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-6 text-sm text-purple-300">{t("Nu există încă evenimente speciale. Creează primul eveniment pentru a obține pagina lui de înscriere.")}</div>}
    {events.map(event => {
      const expanded = expandedId === event.id;
      const past = new Date(event.eventDate).getTime() <= Date.now();
      const full = event.confirmedCount >= event.maxTeams;
      return <article key={event.id} data-testid={`custom-event-admin-${event.id}`} className="min-w-0 overflow-hidden rounded-xl border border-purple-800/40 bg-purple-950/20" aria-label={event.name}>
        <button onClick={() => setExpandedId(expanded ? null : event.id)} aria-expanded={expanded} aria-controls={`custom-event-${event.id}`} className="flex w-full flex-wrap items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-purple-900/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-amber-400">
          <div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-white">{event.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${event.isPublished ? "bg-emerald-900/40 text-emerald-300" : "bg-purple-800/40 text-purple-200"}`}>{event.isPublished ? t("Publicat") : t("Ciornă")}</span>
            {(past || !event.registrationOpen) && <span className="text-[10px] text-amber-300">{past ? t("Eveniment încheiat") : t("Înscrieri închise")}</span>}
          </div><p className="mt-1 text-xs text-purple-300/70">{dateLabel(event.eventDate)}</p></div>
          <span className={`text-xs font-semibold ${full ? "text-amber-300" : "text-emerald-300"}`}>{t("{0}/{1} acceptate · {2} în așteptare", [event.confirmedCount, event.maxTeams, event.waitlistCount])}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-purple-400" /> : <ChevronDown className="h-4 w-4 text-purple-400" />}
        </button>
        {expanded && <div id={`custom-event-${event.id}`} className="space-y-5 border-t border-purple-800/30 p-4">
          <div className="space-y-2"><p className="break-words font-semibold text-amber-200">{event.title}</p>{event.subtitle && <p className="whitespace-pre-line break-words text-sm text-purple-200">{event.subtitle}</p>}
            <p className="break-words text-xs text-purple-300">{event.venue} · {event.address} · {event.feeLabel}</p>
            {event.isCollaboration && <p className="break-words text-xs text-amber-300">{t("În colaborare cu {0}", [event.collaboratorName])}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {event.isPublished ? <a href={`/${event.slug}`} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} max-w-full break-all`}><ExternalLink className="h-4 w-4 shrink-0" />/{event.slug}</a>
              : <span className="max-w-full break-all text-sm text-purple-300">/{event.slug} · {t("Pagina este ascunsă până la publicare.")}</span>}
            {event.isPublished && <button onClick={() => void copyLink(event)} className={secondaryButton} aria-label={t("Copiază linkul evenimentului")}>{copiedId === event.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiedId === event.id ? t("Copiat") : t("Copiază linkul")}</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openEditor(event)} disabled={busy} className={secondaryButton}><Edit2 className="h-4 w-4" />{t("Editează evenimentul")}</button>
            <button onClick={() => void mutate(() => api("PATCH", `/api/admin/custom-events/${event.id}`, { ...eventInput(event), isPublished: !event.isPublished }), event.isPublished ? "Eveniment ascuns." : "Eveniment publicat.")} disabled={busy} className={secondaryButton}>{event.isPublished ? t("Ascunde pagina") : t("Publică pagina")}</button>
            <button onClick={() => void mutate(() => api("PATCH", `/api/admin/custom-events/${event.id}`, { ...eventInput(event), registrationOpen: !event.registrationOpen }), event.registrationOpen ? "Înscrierile au fost închise." : "Înscrierile au fost deschise.")} disabled={busy || past} className={secondaryButton}>{event.registrationOpen ? t("Închide înscrierile") : t("Deschide înscrierile")}</button>
            {!event.registrations.length && <button onClick={() => { setError(""); setConfirm({ event }); }} disabled={busy} className={`${secondaryButton} text-red-300`}><Trash2 className="h-4 w-4" />{t("Șterge evenimentul")}</button>}
          </div>
          <p className="text-xs leading-relaxed text-purple-300">{t("Capacitate fixă: {0} echipe. Pentru a accepta mai multe echipe, modifică numărul maxim din detaliile evenimentului. Locurile eliberate nu promovează automat lista de așteptare.", [event.maxTeams])}</p>
          <div><h4 className="mb-3 text-sm font-semibold text-white">{t("Înscrieri la eveniment")}</h4>
            {!event.registrations.length ? <p className="text-sm text-purple-400">{t("Nicio echipă înregistrată.")}</p> : <div className="overflow-x-auto rounded-lg border border-purple-800/30" role="region" aria-label={t("Echipele evenimentului")} tabIndex={0}>
              <table className="w-full text-left text-sm"><thead className="bg-purple-950/50 text-xs text-purple-300"><tr>
                <th className="px-3 py-2">{t("Echipă")}</th><th className="px-3 py-2">{t("Căpitan")}</th><th className="px-3 py-2">{t("Contact")}</th><th className="px-3 py-2">{t("Membri")}</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">{t("Acțiuni")}</th>
              </tr></thead><tbody>{event.registrations.slice().sort((a, b) => Number(b.status === "WAITLISTED") - Number(a.status === "WAITLISTED") || a.registeredAt.localeCompare(b.registeredAt)).map(registration => <tr key={registration.id} className="border-t border-purple-800/20">
                <td className="max-w-48 break-words px-3 py-3 font-medium text-white">{registration.teamName}</td><td className="px-3 py-3 text-purple-200">{registration.captainName}</td>
                <td className="px-3 py-3 text-xs text-purple-300"><span className="block">{registration.email}</span>{registration.phoneNumber && <span>{registration.phoneNumber}</span>}</td>
                <td className="px-3 py-3 text-purple-200">{registration.memberCount}</td><td className="whitespace-nowrap px-3 py-3 text-xs"><span className={registration.status === "WAITLISTED" ? "text-amber-300" : "text-emerald-300"}>{registration.status === "WAITLISTED" ? t("În așteptare") : t("Acceptată")}</span><time className="mt-1 block text-purple-400">{new Date(registration.registeredAt).toLocaleString(locale(), { timeZone: "Europe/Bucharest" })}</time></td>
                <td className="px-3 py-3"><div className="flex items-center justify-end gap-2">
                  {registration.status === "WAITLISTED" && <button onClick={() => void mutate(() => api("POST", `/api/admin/registrations/${registration.id}/approve`), "Echipa a fost acceptată.")} disabled={busy || full || past} title={full ? t("Mărește mai întâi capacitatea evenimentului.") : undefined} className="whitespace-nowrap rounded-lg bg-emerald-700 px-3 py-2 text-xs text-white disabled:opacity-40">{t("Acceptă echipa")}</button>}
                  <button onClick={() => { setFormError(""); setEditingRegistration(registration); setRegistrationDraft({ teamName: registration.teamName, captainName: registration.captainName, email: registration.email, phoneNumber: registration.phoneNumber ?? "", memberCount: registration.memberCount }); }} disabled={busy} aria-label={t("Editează înscrierea pentru {0}", [registration.teamName])} className="rounded p-2 text-purple-300 hover:text-amber-300 disabled:opacity-40"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => { setError(""); setConfirm({ registration }); }} disabled={busy} aria-label={t("Șterge înscrierea pentru {0}", [registration.teamName])} className="rounded p-2 text-purple-300 hover:text-red-300 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>)}</tbody></table>
            </div>}
          </div>
        </div>}
      </article>;
    })}
    {editingEvent && <Dialog open onOpenChange={open => { if (!open && !busy) closeEventEditor(); }}>
      <DialogContent aria-describedby="custom-event-editor-description" className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-2xl border-purple-700/50 bg-[#0f041e] p-5 text-white sm:p-6">
        <DialogTitle className="flex items-center gap-2 text-lg font-bold"><Calendar className="h-5 w-5 text-amber-400" />{editingEvent === "new" ? t("Creează eveniment") : t("Editează evenimentul")}</DialogTitle>
        <p id="custom-event-editor-description" className="text-xs leading-relaxed text-purple-300">{t("Textele de mai jos apar pe pagina evenimentului. Locația, taxa și capacitatea au valori implicite pe care le poți modifica.")}</p>
        <form onSubmit={saveEvent} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="custom-event-name" className="mb-1.5 block text-xs text-purple-300">{t("Nume eveniment")}</label>
            <input id="custom-event-name" value={draft.name} required minLength={2} maxLength={120} className={inputClass} onChange={event => { const name = event.target.value; setDraft(value => ({ ...value, name, ...(!slugEdited ? { slug: suggestedSlug(name) } : {}), ...(!titleEdited ? { title: name } : {}) })); }} autoFocus /></div>
            <div><label htmlFor="custom-event-slug" className="mb-1.5 block text-xs text-purple-300">{t("Adresă pagină")}</label><div className="flex items-center gap-2"><span className="text-purple-400">/</span><input id="custom-event-slug" value={draft.slug} required minLength={2} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputClass} onChange={event => { setSlugEdited(true); setDraft(value => ({ ...value, slug: event.target.value.toLowerCase() })); }} /></div></div></div>
          {editingEvent !== "new" && <p className="text-xs text-amber-200/80">{t("Schimbarea adresei paginii dezactivează linkul vechi. Trimite participanților noul link.")}</p>}
          <div><label htmlFor="custom-event-title" className="mb-1.5 block text-xs text-purple-300">{t("Titlu pagină")}</label><input id="custom-event-title" value={draft.title} required minLength={2} maxLength={200} className={inputClass} onChange={event => { setTitleEdited(true); setDraft(value => ({ ...value, title: event.target.value })); }} /></div>
          <div><label htmlFor="custom-event-subtitle" className="mb-1.5 block text-xs text-purple-300">{t("Subtitlu pagină")}</label><textarea id="custom-event-subtitle" value={draft.subtitle} rows={3} maxLength={1000} className={inputClass} onChange={event => setDraft(value => ({ ...value, subtitle: event.target.value }))} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="custom-event-date" className="mb-1.5 block text-xs text-purple-300">{t("Data și ora (România)")}</label><input id="custom-event-date" type="datetime-local" min="2026-01-01T00:00" max="2100-12-31T23:59" value={draft.eventDateLocal} required className={`${inputClass} [color-scheme:dark]`} onChange={event => setDraft(value => ({ ...value, eventDateLocal: event.target.value }))} /></div>
            <div><label htmlFor="custom-event-capacity" className="mb-1.5 block text-xs text-purple-300">{t("Număr maxim de echipe")}</label><input id="custom-event-capacity" type="number" min={editingEvent === "new" ? 1 : Math.max(1, editingEvent.confirmedCount)} max={1000} step={1} value={draft.maxTeams} required className={inputClass} onChange={event => setDraft(value => ({ ...value, maxTeams: event.target.value }))} /></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="custom-event-venue" className="mb-1.5 block text-xs text-purple-300">{t("Locație")}</label><input id="custom-event-venue" value={draft.venue} required minLength={2} maxLength={160} className={inputClass} onChange={event => setDraft(value => ({ ...value, venue: event.target.value }))} /></div>
            <div><label htmlFor="custom-event-fee" className="mb-1.5 block text-xs text-purple-300">{t("Taxă")}</label><input id="custom-event-fee" value={draft.feeLabel} required maxLength={160} className={inputClass} onChange={event => setDraft(value => ({ ...value, feeLabel: event.target.value }))} /></div></div>
          <div><label htmlFor="custom-event-address" className="mb-1.5 block text-xs text-purple-300">{t("Adresă locație")}</label><input id="custom-event-address" value={draft.address} required minLength={2} maxLength={240} className={inputClass} onChange={event => setDraft(value => ({ ...value, address: event.target.value }))} /></div>
          <section aria-labelledby="custom-event-prizes-label" className="space-y-4 border-t border-purple-800/40 pt-4">
            <h3 id="custom-event-prizes-label" className="font-semibold text-amber-300">{t("Premii")}</h3>
            {([{ key: "first", place: 1 }, { key: "second", place: 2 }, { key: "third", place: 3 }] as const).map(({ key, place }) => <div key={key} className="space-y-2">
              <label htmlFor={`custom-event-prize-${key}-title`} className="block text-xs text-purple-300">{t("Premiu pentru locul {0}", [place])}</label>
              <input id={`custom-event-prize-${key}-title`} required maxLength={120} value={draft.prizes[key].title} className={inputClass} onChange={event => setDraft(value => ({ ...value, prizes: { ...value.prizes, [key]: { ...value.prizes[key], title: event.target.value } } }))} />
              <label htmlFor={`custom-event-prize-${key}-description`} className="block text-xs text-purple-300">{t("Descriere premiu pentru locul {0}", [place])}</label>
              <textarea id={`custom-event-prize-${key}-description`} rows={2} maxLength={600} value={draft.prizes[key].description} className={inputClass} onChange={event => setDraft(value => ({ ...value, prizes: { ...value.prizes, [key]: { ...value.prizes[key], description: event.target.value } } }))} />
            </div>)}
          </section>
          <section className="space-y-4 border-t border-purple-800/40 pt-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-amber-300"><input type="checkbox" checked={draft.isCollaboration} onChange={event => setDraft(value => ({ ...value, isCollaboration: event.target.checked }))} className="h-4 w-4 accent-amber-400" />{t("Eveniment în colaborare")}</label>
            <p className="text-xs leading-relaxed text-purple-300">{t("Activează pentru a afișa logoul colaboratorului lângă logoul Transilvania Trivia.")}</p>
            {draft.isCollaboration && <div className="space-y-4">
              <div><label htmlFor="custom-event-collaborator-name" className="mb-1.5 block text-xs text-purple-300">{t("Nume colaborator")}</label><input id="custom-event-collaborator-name" required maxLength={120} value={draft.collaboratorName} className={inputClass} onChange={event => setDraft(value => ({ ...value, collaboratorName: event.target.value }))} /></div>
              <div><label htmlFor="custom-event-collaborator-logo" className="mb-1.5 block text-xs text-purple-300">{t("Logo colaborator (PNG, maximum 1 MB)")}</label><input ref={logoFileInput} id="custom-event-collaborator-logo" type="file" accept="image/png,.png" disabled={logoLoading} className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-purple-800 file:px-3 file:py-1 file:text-purple-100`} onChange={event => void selectLogo(event.target.files?.[0])} />
                <p className="mt-2 text-xs text-purple-300">{t("Folosește un PNG cu fundal transparent. Încarcă un alt fișier pentru a înlocui logoul.")}</p>
              </div>
              {logoLoading && <p role="status" className="text-xs text-purple-300">{t("Se încarcă logoul…")}</p>}
              {logoLoadFailed && editingEvent !== "new" && <button type="button" onClick={() => loadLogo(editingEvent)} className={secondaryButton}>{t("Reîncarcă logoul")}</button>}
              {logoPreview && <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-purple-800/40 bg-[#07020d] p-4">
                <div className="flex min-w-0 flex-1 items-center justify-center gap-5"><img src="/logo-main.webp" width={880} height={880} alt="Transilvania Trivia" className="h-20 w-20 shrink-0 object-contain" /><span aria-hidden="true" className="text-lg text-amber-300">×</span><img data-testid="custom-event-logo-preview" src={logoPreview} alt={draft.collaboratorName || t("Logo colaborator")} className="h-20 w-32 min-w-0 object-contain" /></div>
                <button type="button" onClick={removeLogo} className={`${secondaryButton} text-red-300`}>{t("Elimină logoul")}</button>
              </div>}
            </div>}
          </section>
          <div className="space-y-3 rounded-lg border border-purple-800/40 p-3"><label className="flex items-center gap-3 text-sm text-purple-100"><input type="checkbox" checked={draft.isPublished} onChange={event => setDraft(value => ({ ...value, isPublished: event.target.checked }))} className="h-4 w-4 accent-amber-400" />{t("Pagină publicată")}</label>
            <label className="flex items-center gap-3 text-sm text-purple-100"><input type="checkbox" checked={draft.registrationOpen} onChange={event => setDraft(value => ({ ...value, registrationOpen: event.target.checked }))} className="h-4 w-4 accent-amber-400" />{t("Înscrieri deschise")}</label>
            <p className="text-xs leading-relaxed text-purple-300">{t("O ciornă nu este vizibilă public. La ora de începere, înscrierile se închid automat. Capacitatea nu crește automat.")}</p></div>
        </fieldset>
          {formError && <p role="alert" className="text-sm text-red-300">{t(formError)}</p>}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={closeEventEditor} disabled={busy} className={secondaryButton}>{t("Anulează")}</button><button type="submit" disabled={busy || logoLoading} className={primaryButton}>{busy ? t("Se salvează…") : t("Salvează evenimentul")}</button></div>
        </form>
      </DialogContent>
    </Dialog>}
    {editingRegistration && <Dialog open onOpenChange={open => { if (!open && !busy) setEditingRegistration(null); }}>
      <DialogContent aria-describedby={undefined} className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl border-purple-700/50 bg-[#0f041e] p-6 text-white">
        <DialogTitle className="font-bold">{t("Editează înscrierea")}</DialogTitle>
        <form onSubmit={saveRegistration} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
          {([{ key: "teamName", label: "Nume echipă", type: "text", required: true, max: 100 }, { key: "captainName", label: "Nume căpitan", type: "text", required: true, max: 100 }, { key: "email", label: "Email", type: "email", required: true, max: 254 }, { key: "phoneNumber", label: "Telefon", type: "tel", required: false, max: 30 }] as const).map(field => <div key={field.key}><label htmlFor={`custom-registration-${field.key}`} className="mb-1.5 block text-xs text-purple-300">{t(field.label)}</label><input id={`custom-registration-${field.key}`} type={field.type} value={registrationDraft[field.key]} required={field.required} maxLength={field.max} minLength={field.required && field.type === "text" ? 2 : undefined} className={inputClass} onChange={event => setRegistrationDraft(value => ({ ...value, [field.key]: event.target.value }))} /></div>)}
          <div><label htmlFor="custom-registration-members" className="mb-1.5 block text-xs text-purple-300">{t("Număr de membri")}</label><input id="custom-registration-members" type="number" min={1} max={6} required value={registrationDraft.memberCount} className={inputClass} onChange={event => setRegistrationDraft(value => ({ ...value, memberCount: Number(event.target.value) }))} /></div>
        </fieldset>{formError && <p role="alert" className="text-sm text-red-300">{t(formError)}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingRegistration(null)} disabled={busy} className={secondaryButton}>{t("Anulează")}</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? t("Se salvează…") : t("Salvează")}</button></div></form>
      </DialogContent>
    </Dialog>}
    <AlertDialog open={!!confirm} onOpenChange={open => { if (!open && !busy) setConfirm(null); }}><AlertDialogContent className="border-purple-700/50 bg-[#0f041e] text-white"><AlertDialogHeader>
      <AlertDialogTitle>{confirm?.event ? t("Șterge evenimentul") : t("Șterge înscrierea")}</AlertDialogTitle>
      <AlertDialogDescription className="break-words text-purple-300">{confirm?.event ? t("Evenimentul „{0}” și pagina lui vor fi șterse. Poți șterge doar evenimente fără înscrieri.", [confirm.event.name]) : t("Ștergi înscrierea echipei „{0}”? Locul eliberat nu va accepta automat o altă echipă.", [confirm?.registration?.teamName ?? ""])}</AlertDialogDescription>
    </AlertDialogHeader>{error && <p role="alert" className="text-sm text-red-300">{t(error)}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy} className="border-purple-700 bg-purple-950 text-purple-100 hover:bg-purple-900">{t("Anulează")}</AlertDialogCancel><AlertDialogAction disabled={busy} className="bg-red-800 text-white hover:bg-red-700" onClick={event => {
      event.preventDefault();
      if (!confirm) return;
      const current = confirm;
      void mutate(() => api("DELETE", current.event ? `/api/admin/custom-events/${current.event.id}` : `/api/admin/registrations/${current.registration!.id}`), current.event ? "Eveniment șters." : "Înscriere ștearsă.", () => setConfirm(null));
    }}>{busy ? t("Se șterge…") : t("Șterge")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
