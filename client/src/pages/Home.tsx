import { useState, useEffect } from "react";
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

export default function Home() {
  const [activeSection, setActiveSection] = useState("hero");
  const [scheduleState, setScheduleState] = useState<ActiveEditionState>(getCurrentOrNextEdition());
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeamItem[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

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

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
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
        editionLabel={`Ediția #${scheduleState.editionNumber} • Marți 20:00`}
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
