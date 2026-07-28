// import HeroSection from "@/components/HeroSection";
// import CountdownTimer from "@/components/CountdownTimer";
// import PrizesSection from "@/components/PrizesSection";
// import JackpotSection from "@/components/JackpotSection";
// import RulesSection from "@/components/RulesSection";
// import FormatSection from "@/components/FormatSection";
// import RegistrationForm from "@/components/RegistrationForm";
// import FooterSection from "@/components/FooterSection";
// import SeasonAnnouncement from "@/components/Announcement";

// export default function Home() {
//   return (
//     <div className="min-h-screen bg-background text-foreground">
//       <HeroSection />
//       <RegistrationForm />
//       <CountdownTimer />
//       <PrizesSection />
//       <JackpotSection />
//       <RulesSection />
//       <FormatSection /> 
//       <RegistrationForm />
//       <FooterSection />
//     </div>
//   );
// }
import { Link } from "wouter";
import { Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#111f38] via-[#21436e] to-[#c78044] flex flex-col items-center justify-between p-4 md:p-8 select-none">
      {/* Top Spacer for balance */}
      <div className="w-full h-2 md:h-6" />

      {/* Main Graphic Container */}
      <main className="w-full max-w-2xl flex items-center justify-center my-auto">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-amber-200/20 backdrop-blur-sm">
          <img
            src="/summer-break.png"
            alt="Transylvania Trivia - Vacanță Frumoasă! Revenim cu un nou sezon în toamnă."
            className="w-full h-auto object-cover block"
          />
        </div>
      </main>

      {/* Discrete Admin Link Footer */}
      <footer className="w-full py-4 flex justify-center items-center">
        <Link href="/admin">
          <span className="text-xs text-amber-100/30 hover:text-amber-200 flex items-center gap-1.5 transition-all duration-200 cursor-pointer bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            <Lock className="w-3 h-3" /> Admin Panel
          </span>
        </Link>
      </footer>
    </div>
  );
}
