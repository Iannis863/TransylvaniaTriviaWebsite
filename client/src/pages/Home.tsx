import HeroSection from "@/components/HeroSection";
import CountdownTimer from "@/components/CountdownTimer";
import PrizesSection from "@/components/PrizesSection";
import JackpotSection from "@/components/JackpotSection";
import RulesSection from "@/components/RulesSection";
import FormatSection from "@/components/FormatSection";
import RegistrationForm from "@/components/RegistrationForm";
import FooterSection from "@/components/FooterSection";
import SeasonAnnouncement from "@/components/Announcement";

// <CountdownTimer /> goes back in the space
// Remove SeasonAnnouncement
// <RegistrationForm /> goes back in the space

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <SeasonAnnouncement />
      
      <PrizesSection />
      <JackpotSection />
      <RulesSection />
      <FormatSection />
      
      <FooterSection />
    </div>
  );
}
