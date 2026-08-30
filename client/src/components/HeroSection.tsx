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
  CheckCircle2
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
    <section className="relative overflow-hidden pt-6 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background Glows & Lightning Aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
        
        {/* Season & Live Indicator Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-purple-950/80 border border-amber-400/40 shadow-[0_0_20px_rgba(246,184,40,0.25)] mb-6 backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-amber-300">
            {seasonName} • EDIȚIA #{editionNumber} DIN 15
          </span>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="text-[11px] text-purple-300 hover:text-white underline ml-1 flex items-center gap-0.5"
          >
            Vezi Tot Sezonul <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Hero Logo Emblem */}
        <div className="relative group my-2">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 via-amber-500/30 to-purple-600/30 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition duration-700 animate-lightning" />
          <img
            src="/logo-main.png"
            alt="Transilvania Trivia Logo"
            className="relative w-64 sm:w-80 md:w-96 lg:w-[420px] h-auto object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)] filter hover:scale-102 transition-transform duration-300"
          />
        </div>

        {/* Tagline & Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading tracking-widest text-gold-gradient mt-4 mb-3 drop-shadow-md max-w-4xl">
          CONCURSUL SUPREM DE TRIVIA LA INSOMNIA
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-purple-200/90 max-w-2xl font-light mb-8">
          5 runde de glorie, întrebări de foc, cardul strategic <span className="text-amber-400 font-medium">Joker</span> și pariul legendar la <span className="text-purple-300 font-medium">Final Gamble</span>.
        </p>

        {/* Live Countdown Timer Grid */}
        <div className="w-full max-w-2xl mb-8">
          <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-3 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            {isHappeningNow ? (
              <span className="text-emerald-400 animate-pulse font-bold">EDIȚIA ESTE ÎN DESFĂȘURARE CHIAR ACUM!</span>
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
                className="gold-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center border border-amber-500/30"
              >
                <div className={`font-heading text-3xl sm:text-5xl md:text-6xl ${unit.color} tracking-tight drop-shadow`}>
                  {unit.value}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-purple-300/80 tracking-widest mt-1">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Details Card */}
        <div className="w-full max-w-3xl glass-panel rounded-2xl p-4 sm:p-6 mb-8 border border-purple-500/30 text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-purple-800/40">
            
            {/* Detail 1: Date & Time */}
            <div className="flex items-start gap-3 p-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-purple-300/70 font-semibold uppercase">Când & La ce oră</div>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">{formattedDate}</div>
                <div className="text-xs text-amber-300 font-medium">{formattedTime}</div>
              </div>
            </div>

            {/* Detail 2: Location */}
            <div className="flex items-start gap-3 p-2 md:pl-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-purple-300/70 font-semibold uppercase">Locație & Atmosferă</div>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">Insomnia Restaurant</div>
                <div className="text-xs text-purple-300">Str. Universității nr. 2, Cluj-Napoca</div>
              </div>
            </div>

            {/* Detail 3: Registration Fee & Capacity */}
            <div className="flex items-start gap-3 p-2 md:pl-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-purple-300/70 font-semibold uppercase">Taxă & Locuri</div>
                <div className="text-sm sm:text-base font-bold text-emerald-300 mt-0.5">10 lei / persoană</div>
                <div className="text-xs text-purple-300">
                  <span className="font-bold text-amber-400">{registeredCount}</span> / {maxTeams} echipe înscrise
                </div>
              </div>
            </div>

          </div>

          {/* Theme Highlight Banner */}
          {theme && (
            <div className="mt-4 pt-4 border-t border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-purple-950/40 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="text-xs text-purple-300 uppercase tracking-wider font-semibold mr-2">Tema Ediției:</span>
                  <span className="text-sm font-bold text-amber-300">{theme}</span>
                </div>
              </div>
              <Badge className="bg-purple-800/60 border-purple-500/40 text-purple-200 text-xs">
                {currentEdition.description}
              </Badge>
            </div>
          )}
        </div>

        {/* Primary Call to Action Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Button
            onClick={onRegisterClick}
            className="gold-btn w-full sm:w-auto px-8 py-6 text-lg sm:text-xl font-heading tracking-widest flex items-center justify-center gap-3 rounded-xl shadow-[0_0_30px_rgba(246,184,40,0.4)]"
          >
            <Sparkles className="w-6 h-6 text-purple-950" />
            ÎNSCRIE-ȚI ECHIPA ACUM
          </Button>

          <Button
            onClick={() => setIsCalendarOpen(true)}
            variant="outline"
            className="w-full sm:w-auto px-6 py-6 text-sm sm:text-base font-heading tracking-wider border-purple-500/40 hover:bg-purple-900/30 text-purple-200 rounded-xl"
          >
            <CalendarDays className="w-5 h-5 text-amber-400 mr-2" />
            CALENDARUL SEZOANELOR (30 EDIȚII)
          </Button>
        </div>

      </div>

      {/* Season Calendar Modal Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#100520] border border-amber-400/30 text-foreground p-6 shadow-[0_0_60px_rgba(168,85,247,0.3)]">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-2xl sm:text-3xl font-heading tracking-widest text-gold-gradient">
              CALENDARUL COMPLET AL SEZOANELOR
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Toate cele 30 de ediții programate în fiecare zi de Marți la ora 20:00
            </DialogDescription>
          </DialogHeader>

          {/* Season Switcher Tabs */}
          <div className="flex items-center justify-center gap-3 my-4">
            <button
              onClick={() => setSelectedSeasonTab(1)}
              className={`px-5 py-2.5 rounded-xl font-heading text-base tracking-wider transition-all ${
                selectedSeasonTab === 1 
                  ? "gold-btn" 
                  : "bg-purple-950/60 border border-purple-700/50 text-purple-300 hover:text-white"
              }`}
            >
              Sezonul 1: Octombrie - Ianuarie (15 Ediții)
            </button>
            <button
              onClick={() => setSelectedSeasonTab(2)}
              className={`px-5 py-2.5 rounded-xl font-heading text-base tracking-wider transition-all ${
                selectedSeasonTab === 2 
                  ? "gold-btn" 
                  : "bg-purple-950/60 border border-purple-700/50 text-purple-300 hover:text-white"
              }`}
            >
              Sezonul 2: Februarie - Mai (15 Ediții)
            </button>
          </div>

          {/* Editions Grid */}
          <div className="space-y-3 mt-4">
            {(selectedSeasonTab === 1 ? season1Editions : season2Editions).map((ed) => {
              const isCurrent = ed.editionNumber === editionNumber && ed.seasonNumber === seasonNumber;
              return (
                <div
                  key={ed.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(246,184,40,0.25)]"
                      : "bg-purple-950/30 border-purple-800/40 hover:border-purple-600/50"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-heading text-lg ${
                      isCurrent ? "bg-amber-400 text-purple-950 font-bold" : "bg-purple-900/60 text-purple-200"
                    }`}>
                      #{ed.editionNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm sm:text-base">
                          Marți, {ed.dayOfMonth} {ed.monthName}
                        </span>
                        {isCurrent && (
                          <Badge className="bg-amber-400 text-purple-950 text-[10px] font-bold">
                            EDIȚIA ACTIVĂ
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-amber-300/90 mt-0.5">{ed.theme}</div>
                      <div className="text-[11px] text-muted-foreground">{ed.description}</div>
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
