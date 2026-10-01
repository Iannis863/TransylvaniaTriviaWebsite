import { t, locale } from "@/lib/i18n";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { getCurrentOrNextEdition, type ActiveEditionState } from "@shared/schedule";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LiveRegistrationSection from "@/components/LiveRegistrationSection";
import RegisteredTeamsGrid, { type RegisteredTeamItem } from "@/components/RegisteredTeamsGrid";
import MiniGamesHub from "@/components/MiniGamesHub";
import RulebookSection from "@/components/RulebookSection";
import TeamDashboard from "@/components/TeamDashboard";
import PrizesSection from "@/components/PrizesSection";
import FooterSection from "@/components/FooterSection";

// Ordered list of section IDs matching the navbar links
const SECTION_IDS = ["hero", "registration", "games", "rulebook", "team", "prizes"];

export default function Home() {
  const { isLoading: isAuthLoading } = useAuth();
  const [activeSection, setActiveSection] = useState("hero");
  const [scheduleState, setScheduleState] = useState<ActiveEditionState>(getCurrentOrNextEdition());
  const [isWaitlistOnly, setIsWaitlistOnly] = useState(false);
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeamItem[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState(false);
  const registrationsRequest = useRef<AbortController | null>(null);
  // Suppress the observer briefly after a nav click so scroll animation doesn't fight it
  const isNavigatingRef = useRef(false);

  // Email links can open the app directly at a section before React has mounted it.
  useEffect(() => {
    if (isAuthLoading) return;
    const navigateToHash = () => {
      const sectionId = window.location.hash.slice(1);
      if (!SECTION_IDS.includes(sectionId)) return;
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "instant", block: "start" });
      setActiveSection(sectionId);
    };
    const frame = requestAnimationFrame(navigateToHash);
    window.addEventListener("hashchange", navigateToHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", navigateToHash);
    };
  }, [isAuthLoading]);

  // Fetch active registered teams for the upcoming edition
  const fetchRegistrations = useCallback(async () => {
    registrationsRequest.current?.abort();
    const controller = new AbortController();
    registrationsRequest.current = controller;
    setIsLoadingTeams(true);
    try {
      const [res, scheduleResponse] = await Promise.all([
        fetch("/api/registrations/active", { signal: controller.signal }),
        fetch("/api/schedule/current", { signal: controller.signal }),
      ]);
      if (!res.ok || !scheduleResponse.ok) throw new Error("Registration data unavailable");
      const state = await scheduleResponse.json();
      let data = await res.json();
      // The two requests can straddle the Wednesday edition boundary.
      if (data.editionId !== state.currentEdition.id) {
        const current = await fetch(`/api/registrations/active?editionId=${encodeURIComponent(state.currentEdition.id)}`, { signal: controller.signal });
        if (!current.ok) throw new Error("Registration data unavailable");
        data = await current.json();
      }
      if (controller.signal.aborted) return;
      setIsWaitlistOnly(state.isFull);
      setScheduleState({ ...state, eventDate: new Date(state.eventDate) });
      setRegisteredTeams(data.teams || []);
      setTeamsError(false);
    } catch {
      if (!controller.signal.aborted) setTeamsError(true);
    } finally {
      if (!controller.signal.aborted) setIsLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
    const timer = setInterval(fetchRegistrations, 60000);
    window.addEventListener("registration-updated", fetchRegistrations);
    window.addEventListener("focus", fetchRegistrations);
    return () => {
      clearInterval(timer);
      registrationsRequest.current?.abort();
      window.removeEventListener("registration-updated", fetchRegistrations);
      window.removeEventListener("focus", fetchRegistrations);
    };
  }, [fetchRegistrations]);

  // IntersectionObserver — highlights whichever section occupies the most viewport area
  useEffect(() => {
    const ratioMap = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (isNavigatingRef.current) return;

        entries.forEach((entry) => {
          ratioMap.set(entry.target.id, entry.intersectionRatio);
        });

        let maxRatio = 0;
        let mostVisible = "";
        ratioMap.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            mostVisible = id;
          }
        });

        if (mostVisible) setActiveSection(mostVisible);
      },
      {
        // Offset the top by navbar height so sections aren't counted as "visible" while under the nav
        rootMargin: "-80px 0px 0px 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      }
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [scheduleState.currentEdition.id]);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    // Pause observer for 800 ms while smooth-scroll animates
    isNavigatingRef.current = true;
    setTimeout(() => { isNavigatingRef.current = false; }, 800);

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    } else if (sectionId === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayDate = scheduleState.eventDate.toLocaleDateString(locale(), { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const editionLabel = t("{0}, ora 20:00", [displayDate]);

  return (
    <div className="min-h-screen bg-[#07020d] text-foreground flex flex-col selection:bg-amber-400 selection:text-purple-950">

      {/* Top Navbar */}
      <Navbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        editionLabel={t("Ediția #{0} • {1}", [scheduleState.editionNumber, displayDate])}
      />

      {/* Main Content Sections */}
      <main className="flex-1 space-y-4">

        {/* 1. Hero & Countdown Section */}
        <div id="hero">
          <HeroSection
            onRegisterClick={() => handleNavigate("registration")}
            registeredCount={registeredTeams.length}
            maxTeams={scheduleState.currentEdition.maxTeams}
          />
        </div>

        {/* 2. Live Registration Section */}
        <LiveRegistrationSection
          key={scheduleState.currentEdition.id}
          editionId={scheduleState.currentEdition.id}
          editionLabel={editionLabel}
          isFull={isWaitlistOnly}
          onRegistrationSuccess={fetchRegistrations}
        />

        {/* 3. Live Registered Teams Grid */}
        <RegisteredTeamsGrid
          teams={registeredTeams}
          maxTeams={scheduleState.currentEdition.maxTeams}
          editionLabel={t("Ediția #{0} ({1})", [scheduleState.editionNumber, displayDate])}
          onRefresh={fetchRegistrations}
          isLoading={isLoadingTeams}
          hasError={teamsError}
        />

        {/* 4. Weekly Mini-Games Hub */}
        <MiniGamesHub
          editionId={scheduleState.currentEdition.id}
          seasonNumber={scheduleState.seasonNumber}
          editionNumber={scheduleState.editionNumber}
          theme={scheduleState.theme}
          secretClue={scheduleState.secretClue}
        />

        {/* 5. Rulebook & Theme Validator */}
        <RulebookSection />

        {/* 6. Team Dashboard */}
        <TeamDashboard />

        {/* 7. Prizes & Venue */}
        <PrizesSection />

      </main>

      {/* Footer */}
      <FooterSection />

    </div>
  );
}
