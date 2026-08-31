import { useState, useEffect, useRef } from "react";
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
  const [activeSection, setActiveSection] = useState("hero");
  const [scheduleState, setScheduleState] = useState<ActiveEditionState>(getCurrentOrNextEdition());
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeamItem[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  // Suppress the observer briefly after a nav click so scroll animation doesn't fight it
  const isNavigatingRef = useRef(false);

  // Fetch active registered teams for the upcoming edition
  const fetchRegistrations = async () => {
    setIsLoadingTeams(true);
    try {
      const editionId = scheduleState.currentEdition.id;
      const res = await fetch(`/api/registrations/active?editionId=${editionId}`);
      if (res.ok) {
        const data = await res.json();
        setRegisteredTeams(data.teams || []);
      }
    } catch (err) {
      console.error("Error fetching registrations:", err);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [scheduleState.currentEdition.id]);

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
  }, []);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    // Pause observer for 800 ms while smooth-scroll animates
    isNavigatingRef.current = true;
    setTimeout(() => { isNavigatingRef.current = false; }, 800);

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else if (sectionId === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const editionLabel = `${scheduleState.formattedDate}, ora 20:00`;

  return (
    <div className="min-h-screen bg-[#07020d] text-foreground flex flex-col selection:bg-amber-400 selection:text-purple-950">
      
      {/* Top Navbar */}
      <Navbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        editionLabel={`Ediția #${scheduleState.editionNumber} • ${scheduleState.formattedDate}`}
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
          editionId={scheduleState.currentEdition.id}
          editionLabel={editionLabel}
          isFull={registeredTeams.length >= scheduleState.currentEdition.maxTeams}
          onRegistrationSuccess={fetchRegistrations}
        />

        {/* 3. Live Registered Teams Grid */}
        <RegisteredTeamsGrid
          teams={registeredTeams}
          maxTeams={scheduleState.currentEdition.maxTeams}
          editionLabel={`Ediția #${scheduleState.editionNumber} (${scheduleState.formattedDate})`}
          onRefresh={fetchRegistrations}
          isLoading={isLoadingTeams}
        />

        {/* 4. Weekly Mini-Games Hub */}
        <MiniGamesHub
          editionId={scheduleState.currentEdition.id}
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
