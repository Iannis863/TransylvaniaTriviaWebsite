import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getCurrentOrNextEdition, getFullSchedule, type ActiveEditionState, type ScheduleEdition } from "@shared/schedule";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  Users, 
  Trophy, 
  Flame, 
  ChevronRight, 
  CalendarDays,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

interface HeroSectionProps {
  onRegisterClick: () => void;
  registeredCount: number;
  maxTeams: number;
}

export default function HeroSection({ onRegisterClick, registeredCount, maxTeams }: HeroSectionProps) {
  const { user, team } = useAuth();
  const [scheduleState, setScheduleState] = useState<ActiveEditionState>(getCurrentOrNextEdition());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedSeasonTab, setSelectedSeasonTab] = useState<1 | 2>(1);

  // Live real-time countdown timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleState(getCurrentOrNextEdition(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    currentEdition,
    formattedDate,
    formattedTime,
    seasonName,
    seasonNumber,
    editionNumber,
    theme,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    isHappeningNow,
    isHappeningToday,
  } = scheduleState;

  const timeUnits = [
    { label: "ZILE", value: daysRemaining.toString().padStart(2, "0"), color: "text-amber-400" },
    { label: "ORE", value: hoursRemaining.toString().padStart(2, "0"), color: "text-amber-300" },
    { label: "MINUTE", value: minutesRemaining.toString().padStart(2, "0"), color: "text-purple-300" },
    { label: "SECUNDE", value: secondsRemaining.toString().padStart(2, "0"), color: "text-purple-400" },
  ];

  const fullSchedule = getFullSchedule();
  const season1Editions = fullSchedule.filter((e) => e.seasonNumber === 1);
  const season2Editions = fullSchedule.filter((e) => e.seasonNumber === 2);

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 min-h-[92dvh] flex flex-col justify-center">
      
      {/* Background Volumetric Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
        
        {/* Micro-Pill Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-amber-400/40 shadow-[0_0_20px_rgba(246,184,40,0.2)] mb-6 backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-xs font-semibold tracking-wider text-amber-300">
            {seasonName} • EDIȚIA #{editionNumber} DIN 15
          </span>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="text-[11px] text-purple-300 hover:text-white underline ml-1 flex items-center gap-0.5"
          >
            Calendar <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Hero Logo Emblem */}
        <div className="relative group my-2">
          <div className="absolute -inset-6 bg-gradient-to-r from-purple-600/30 via-amber-500/25 to-purple-600/30 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition duration-700 animate-lightning" />
          <img
            src="/logo-main.png"
            alt="Transilvania Trivia Logo"
            className="relative w-64 sm:w-80 md:w-96 lg:w-[400px] h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] filter hover:scale-102 transition-transform duration-500"
          />
        </div>

        {/* Master Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading tracking-widest text-gold-gradient mt-6 mb-4 drop-shadow-lg max-w-4xl leading-tight">
          CONCURSUL SUPREM DE TRIVIA LA INSOMNIA
        </h1>
        
        {/* Value Proposition */}
        <p className="text-base sm:text-lg md:text-xl text-purple-200/90 max-w-2xl font-light mb-10 leading-relaxed">
          5 runde de glorie, întrebări de foc, cardul strategic <strong className="text-amber-400 font-semibold">Joker</strong> și miza legendară la <strong className="text-purple-300 font-semibold">Final Gamble</strong>.
        </p>

        {/* Double-Bezel Countdown Machine */}
        <div className="w-full max-w-2xl mb-10">
          <div className="p-2 rounded-[2rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
            <div className="p-4 sm:p-6 rounded-[calc(2rem-0.5rem)] bg-[#0d041a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
              
              <div className="text-[11px] uppercase tracking-[0.2em] text-purple-300 font-bold mb-4 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                {isHappeningNow ? (
                  <span className="text-emerald-400 animate-pulse font-bold">EDIȚIA ARE LOC CHIAR ACUM LA INSOMNIA!</span>
                ) : isHappeningToday ? (
                  <span className="text-amber-400 font-bold">EDIȚIA ARE LOC ASTĂZI LA ORA 20:00!</span>
                ) : (
                  <span>TIMP RĂMAS PÂNĂ LA URMĂTOAREA EDIȚIE</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {timeUnits.map((unit) => (
                  <div 
                    key={unit.label}
                    className="p-3 sm:p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 flex flex-col items-center justify-center shadow-inner"
                  >
                    <div className={`font-heading text-3xl sm:text-5xl md:text-6xl ${unit.color} tracking-tight drop-shadow`}>
                      {unit.value}
                    </div>
                    <div className="text-[10px] sm:text-xs font-semibold text-purple-300/80 tracking-widest mt-1 font-sans">
                      {unit.label}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Double-Bezel Event Metadata Shell */}
        <div className="w-full max-w-3xl p-2 rounded-[2rem] bg-purple-950/20 ring-1 ring-purple-500/30 shadow-2xl mb-10 text-left">
          <div className="p-6 rounded-[calc(2rem-0.5rem)] bg-[#0e041d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-purple-800/40">
              
              {/* Detail 1 */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">Când & La ce oră</div>
                  <div className="text-sm font-bold text-white mt-0.5">{formattedDate}</div>
                  <div className="text-xs text-amber-300 font-medium">{formattedTime}</div>
                </div>
              </div>

              {/* Detail 2 */}
              <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:pl-5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">Locație & Atmosferă</div>
                  <div className="text-sm font-bold text-white mt-0.5">Insomnia Restaurant</div>
                  <div className="text-xs text-purple-300/80">Str. Universității nr. 2, Cluj</div>
                </div>
              </div>

              {/* Detail 3 */}
              <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:pl-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">Taxă & Locuri</div>
                  <div className="text-sm font-bold text-emerald-300 mt-0.5">10 lei / persoană</div>
                  <div className="text-xs text-purple-300/80">
                    <strong className="text-amber-400">{registeredCount}</strong> / {maxTeams} echipe înscrise
                  </div>
                </div>
              </div>

            </div>

            {/* Theme Strip */}
            {theme && (
              <div className="mt-5 pt-4 border-t border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-purple-950/50 px-4 py-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-purple-300 font-bold uppercase mr-1">Tema Ediției:</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-300">{theme}</span>
                </div>
                <Badge className="bg-purple-900/60 border-purple-600/40 text-purple-200 text-[11px]">
                  {currentEdition.description}
                </Badge>
              </div>
            )}

          </div>
        </div>

        {/* Button-in-Button CTA Architecture */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Button
            onClick={onRegisterClick}
            className="gold-btn rounded-full px-8 py-7 text-lg font-heading tracking-widest shadow-[0_0_35px_rgba(246,184,40,0.4)] group flex items-center gap-3 w-full sm:w-auto justify-center"
          >
            <span>ÎNSCRIE-ȚI ECHIPA ACUM</span>
            <span className="w-8 h-8 rounded-full bg-black/15 dark:bg-white/20 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform">
              <ArrowRight className="w-4 h-4 text-purple-950" />
            </span>
          </Button>

          <Button
            onClick={() => setIsCalendarOpen(true)}
            variant="outline"
            className="rounded-full px-6 py-7 text-sm font-heading tracking-wider border-purple-500/40 hover:bg-purple-900/30 text-purple-200 w-full sm:w-auto"
          >
            <CalendarDays className="w-4 h-4 text-amber-400 mr-2" />
            CALENDARUL SEZOANELOR (30 EDIȚII)
          </Button>
        </div>

      </div>

      {/* Season Calendar Modal Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#0d0319] border-2 border-amber-400/40 text-foreground p-6 sm:p-8 rounded-[2.5rem] shadow-[0_0_80px_rgba(246,184,40,0.3)]">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-2xl sm:text-3xl font-heading tracking-widest text-gold-gradient">
              CALENDARUL SEZOANELOR 1 & 2
            </DialogTitle>
            <DialogDescription className="text-purple-300/70 text-xs">
              Toate cele 30 de ediții programate în fiecare zi de Marți la ora 20:00 la Insomnia Restaurant
            </DialogDescription>
          </DialogHeader>

          {/* Season Switcher Tabs */}
          <div className="flex items-center justify-center gap-3 my-4">
            <button
              onClick={() => setSelectedSeasonTab(1)}
              className={`px-5 py-2.5 rounded-full font-heading text-sm tracking-wider transition-all ${
                selectedSeasonTab === 1 
                  ? "gold-btn" 
                  : "bg-purple-950/60 border border-purple-700/50 text-purple-300 hover:text-white"
              }`}
            >
              Sezonul 1: Octombrie - Ianuarie (15 Ediții)
            </button>
            <button
              onClick={() => setSelectedSeasonTab(2)}
              className={`px-5 py-2.5 rounded-full font-heading text-sm tracking-wider transition-all ${
                selectedSeasonTab === 2 
                  ? "gold-btn" 
                  : "bg-purple-950/60 border border-purple-700/50 text-purple-300 hover:text-white"
              }`}
            >
              Sezonul 2: Februarie - Mai (15 Ediții)
            </button>
          </div>

          {/* Editions Grid */}
          <div className="space-y-2.5 mt-4">
            {(selectedSeasonTab === 1 ? season1Editions : season2Editions).map((ed) => {
              const isCurrent = ed.editionNumber === editionNumber && ed.seasonNumber === seasonNumber;
              return (
                <div
                  key={ed.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-amber-500/15 border-amber-400 shadow-[0_0_25px_rgba(246,184,40,0.25)]"
                      : "bg-purple-950/30 border-purple-800/40 hover:border-purple-600/50"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading text-lg ${
                      isCurrent ? "bg-amber-400 text-purple-950 font-bold" : "bg-purple-900/60 text-purple-200"
                    }`}>
                      #{ed.editionNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          Marți, {ed.dayOfMonth} {ed.monthName}
                        </span>
                        {isCurrent && (
                          <Badge className="bg-amber-400 text-purple-950 text-[10px] font-bold">
                            EDIȚIA ACTIVĂ
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-amber-300/90 mt-0.5">{ed.theme}</div>
                      <div className="text-[11px] text-purple-300/70">{ed.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs text-purple-300/80 font-mono">20:00</span>
                    <Badge variant="outline" className="border-purple-600/40 text-purple-300 text-[11px]">
                      Max {ed.maxTeams} Echipe
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
