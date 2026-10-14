import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { customEventRegistrationKey, type CustomEventPublicResponse } from "@shared/custom-events";
import { getLanguage, locale, t, useLanguage } from "@/lib/i18n";
import LiveRegistrationSection from "@/components/LiveRegistrationSection";
import RegisteredTeamsGrid from "@/components/RegisteredTeamsGrid";
import PrizesSection from "@/components/PrizesSection";
import { Button } from "@/components/ui/button";

function HomepageLink() {
  return <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "instant" })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-purple-500/50 px-6 py-3 text-sm text-purple-100 transition-colors hover:border-amber-400/60 hover:bg-purple-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
    <ArrowLeft className="h-4 w-4 shrink-0" />
    {t("Înapoi la pagina principală")}
  </Link>;
}

export default function CustomEvent() {
  const { slug = "" } = useParams<{ slug: string }>();
  const language = useLanguage();
  const queryClient = useQueryClient();
  const query = useQuery<CustomEventPublicResponse | null>({
    queryKey: ["custom-event", slug],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/custom-events/${encodeURIComponent(slug)}`, { signal });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(t("Evenimentul nu a putut fi încărcat."));
      return response.json();
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const event = query.data?.event;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["custom-event", slug] }); };
    window.addEventListener("registration-updated", refresh);
    return () => window.removeEventListener("registration-updated", refresh);
  }, [queryClient, slug]);

  useEffect(() => {
    if (event) document.title = `${event.title} — Transilvania Trivia`;
    return () => {
      document.title = getLanguage() === "ro" ? "Transilvania Trivia — Quiz săptămânal la Insomnia" : "Transilvania Trivia — Weekly quiz at Insomnia";
    };
  }, [event?.title, language]);

  if (!query.data) {
    return <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 pb-28 pt-16 text-center">
      <img src="/logo-main.webp" width={880} height={880} alt="Transilvania Trivia" className="h-auto w-56 max-w-full" />
      {query.isLoading ? <p role="status" className="text-purple-200">{t("Se încarcă…")}</p> : query.isError ? <>
        <h1 className="text-3xl text-amber-300">{t("Evenimentul nu a putut fi încărcat.")}</h1>
        <Button onClick={() => query.refetch()} className="gold-btn rounded-full px-6">{t("Reîncearcă")}</Button>
      </> : <>
        <h1 className="text-3xl text-amber-300">404 — {t("Pagină negăsită")}</h1>
        <p className="max-w-md text-purple-200">{t("Acest eveniment nu este disponibil.")}</p>
      </>}
      {!query.isLoading && <HomepageLink />}
    </main>;
  }

  const data = query.data;
  const currentEvent = data.event;
  const date = new Date(currentEvent.eventDate);
  const dateLabel = date.toLocaleDateString(locale(), { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = date.toLocaleTimeString(locale(), { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hour12: false });
  const editionLabel = `${dateLabel}, ${timeLabel}`;
  const registrationClosed = data.registrationClosed || !currentEvent.registrationOpen || date.getTime() <= Date.now();
  const isCollaboration = currentEvent.isCollaboration && !!currentEvent.collaboratorLogoUrl;
  const collaborationLogoClass = "aspect-square w-full min-w-0 max-w-[280px] justify-self-center object-contain";

  return <main data-testid="custom-event-page" className="min-h-screen bg-[#07020d] text-foreground selection:bg-amber-400 selection:text-purple-950">
    <header className="relative overflow-hidden px-4 pb-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-36 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-600/15 blur-[120px]" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
        <div data-testid="custom-event-logos" role={isCollaboration ? "group" : undefined} aria-label={isCollaboration ? t("Eveniment în colaborare cu {0}", [currentEvent.collaboratorName]) : undefined} className={isCollaboration ? "grid w-full max-w-3xl grid-cols-2 items-center gap-4 sm:gap-8" : "max-w-full"}>
          <img src="/logo-main.webp" width={880} height={880} fetchPriority="high" alt="Transilvania Trivia" className={isCollaboration ? `${collaborationLogoClass} drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)]` : "h-auto w-[260px] max-w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] sm:w-[320px]"} />
          {isCollaboration && <img src={currentEvent.collaboratorLogoUrl!} fetchPriority="high" decoding="async" alt={currentEvent.collaboratorName || t("Logo colaborator")} className={collaborationLogoClass} />}
        </div>
        <h1 data-testid="custom-event-title" className="text-gold-gradient mt-6 w-full max-w-4xl break-words py-2 font-heading text-4xl leading-tight tracking-wider sm:text-5xl md:text-6xl">
          {currentEvent.title}
        </h1>
        {currentEvent.subtitle && <p className="mt-3 w-full max-w-2xl whitespace-pre-line break-words text-base font-light leading-relaxed text-purple-200/90 sm:text-lg">
          {currentEvent.subtitle}
        </p>}
        <dl data-testid="custom-event-details" className="mt-9 grid w-full max-w-4xl grid-cols-1 gap-6 rounded-3xl border border-amber-400/25 bg-[#0e041d] p-6 text-left md:grid-cols-3 md:gap-8 sm:p-8">
          <div className="min-w-0">
            <dt className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300">
              <CalendarDays className="h-4 w-4 text-amber-400" /> {t("Când / La ce oră")}
            </dt>
            <dd className="text-sm font-semibold leading-relaxed text-white">
              <time dateTime={currentEvent.eventDate} className="break-words">{dateLabel.charAt(0).toLocaleUpperCase(locale()) + dateLabel.slice(1)}</time>
              <span className="mt-1 block text-amber-300">{timeLabel} <span className="font-normal text-purple-300">{t("· ora României")}</span></span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300">
              <MapPin className="h-4 w-4 text-purple-400" /> {t("Locație")}
            </dt>
            <dd className="break-words text-sm font-semibold leading-relaxed text-white">{currentEvent.venue}<span className="mt-1 block text-xs font-normal text-purple-300">{currentEvent.address}</span></dd>
          </div>
          <div className="min-w-0">
            <dt className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300">
              <Users className="h-4 w-4 text-emerald-400" /> {t("Taxă & Locuri")}
            </dt>
            <dd className="break-words text-sm font-semibold leading-relaxed text-emerald-300">{currentEvent.feeLabel}
              <span className="mt-1 block text-xs font-normal text-purple-300">{t("Maximum {0} echipe", [currentEvent.maxTeams])} · {t("{0} confirmate", [data.confirmedCount])}</span>
            </dd>
          </div>
        </dl>
      </div>
    </header>

    {registrationClosed ? <section id="registration" className="mx-auto max-w-4xl px-4 pb-4 pt-16 sm:px-6">
      <div role="status" className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
        <h2 className="text-2xl text-amber-300">{t("Înscrierile sunt închise")}</h2>
        <p className="mt-2 text-sm text-purple-200">{t("Înscrierile pentru acest eveniment nu mai sunt disponibile.")}</p>
      </div>
    </section> : <LiveRegistrationSection
      editionId={customEventRegistrationKey(currentEvent.id)}
      editionLabel={editionLabel}
      isFull={data.isFull}
      customEvent={{ venue: currentEvent.venue, feeLabel: currentEvent.feeLabel }}
      registrationEndpoint={`/api/custom-events/${encodeURIComponent(currentEvent.slug)}/registrations`}
      onRegistrationSuccess={() => { void queryClient.invalidateQueries({ queryKey: ["custom-event", slug] }); }}
    />}

    <RegisteredTeamsGrid
      teams={data.teams}
      maxTeams={currentEvent.maxTeams}
      editionLabel={currentEvent.name}
      customEvent
      onRefresh={() => { void query.refetch(); }}
      isLoading={query.isFetching}
      hasError={query.isError}
    />
    <PrizesSection customEvent={{ prizes: currentEvent.prizes }} />
    <div className="px-4 pb-28 pt-2 text-center"><HomepageLink /></div>
  </main>;
}
