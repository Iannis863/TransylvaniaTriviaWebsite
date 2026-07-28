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
export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#111f38] via-[#21436e] to-[#c78044] flex flex-col items-center justify-center p-4 md:p-8 select-none">
      {/* Main Graphic Container */}
      <main className="w-full max-w-2xl flex items-center justify-center my-auto">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-amber-200/20 backdrop-blur-sm">
          <img
            src="/summer-break.jpg"
            alt="Transylvania Trivia - Vacanță Frumoasă! Revenim cu un nou sezon în toamnă."
            className="w-full h-auto object-cover block"
          />
        </div>
      </main>
    </div>
  );
}
