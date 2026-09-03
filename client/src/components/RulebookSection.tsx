import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Sparkles, 
  Crown, 
  HelpCircle, 
  Flame, 
  Zap, 
  CheckCircle2, 
  Scale, 
  Trophy,
  Layers,
  ArrowRight
} from "lucide-react";
import ThemeValidator from "./ThemeValidator";

export default function RulebookSection() {
  const [activeTab, setActiveTab] = useState("rounds");

  const rounds = [
    {
      number: "1",
      name: "Cultură Generală",
      questions: "10 Întrebări",
      points: "1 punct / răspuns corect",
      desc: "Întrebări diverse de încălzire din științe, geografie, istorie și multe altele.",
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "2",
      name: "Ghicește Legătura",
      questions: "10 legături",
      points: "1 punct / răspuns corect",
      desc: "Vor fi afișate 3 imagini pe ecran și va trebui să ghiciți care este legătura dintre ele.",
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "3",
      name: "Ghicește Melodia",
      questions: "10 melodii",
      points: "0.5/melodie & 0.5/artist",
      desc: "Recunoaște numele melodiei și artistul pentru 10 piese din genuri și perioade muzicale variate.",
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "4",
      name: "Runda Surpriză",
      questions: "10 Întrebări",
      points: "1 punct / răspuns corect",
      desc: "Pentru a afla categoria rundei, rezolvă alături de echipă cele 5 jocuri din meniul de jocuri.",
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "5",
      name: "Runda Aleasă",
      questions: "10 Întrebări",
      points: "1 punct / răspuns corect",
      desc: "Această rundă este aleasă de echipa care s-a clasat pe ultimul loc la ediția precedentă.",
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "P",
      name: "Pariul",
      questions: "1 Întrebare Bonus",
      points: "Pariu (2 - 20 puncte)",
      desc: "Întrebare de dificultate ridicată cu 4 variante de răspuns.",
      jokerEligible: false,
      hasJokerBadge: false,
    },
  ];

  return (
    <section id="rulebook" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Desfășurare & Mecanici
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading tracking-widest text-gold-gradient">
            REGULAMENTUL OFICIAL
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-2 font-light">
            Descoperă structura celor 5 runde, Jokerul, Pariul și validatorul de teme.
          </p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          
          <div className="flex justify-center mb-8">
            <TabsList className="bg-purple-950/80 border border-purple-700/50 p-1.5 rounded-full">
              <TabsTrigger
                value="rounds"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                Cele 5 Runde & Pariul
              </TabsTrigger>
              <TabsTrigger
                value="mechanics"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                Regulament
              </TabsTrigger>
              <TabsTrigger
                value="validator"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                Validator Teme Noi
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: ROUNDS BREAKDOWN + CARDS */}
          <TabsContent value="rounds" className="space-y-8">
            <div className="grid grid-cols-1 gap-4">
              {rounds.map((round) => (
                <div
                  key={round.number}
                  className="p-1 rounded-2xl bg-purple-950/20 border border-purple-800/40 hover:border-amber-400/40 transition-all shadow-md"
                >
                  <div className="p-5 rounded-xl bg-[#0f041e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-purple-950 font-heading font-bold flex items-center justify-center shadow flex-shrink-0">
                        <span className={round.number === "P" ? "text-3xl" : "text-xl"}>
                          {round.number === "P" ? "P" : `R${round.number}`}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <h3 className="font-heading text-lg text-white tracking-wide">{round.name}</h3>
                          {round.hasJokerBadge && (
                            round.jokerEligible ? (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px]">
                                JOKER APLICABIL
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-purple-300 text-[10px]">
                                FĂRĂ JOKER
                              </Badge>
                            )
                          )}
                        </div>
                        <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">{round.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center font-mono text-xs flex-shrink-0">
                      <span className="text-purple-300">{round.questions}</span>
                      <span className="text-amber-400 font-bold">|</span>
                      <span className="text-amber-300 font-bold">{round.points}</span>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Mechanics Cards in the same tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Joker Card */}
              <div className="p-2 rounded-[2rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-xl">
                <div className="p-6 rounded-[calc(2rem-0.5rem)] bg-[#0e041d] h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl mb-4">
                      🃏
                    </div>
                    <h3 className="text-xl font-heading text-gold-gradient tracking-wide mb-2">
                      CARDUL JOKER
                    </h3>
                    <p className="text-xs text-purple-200/80 leading-relaxed space-y-2">
                      Poți folosi cardul Joker la începutul oricărei din cele 5 runde (dar <strong className="text-amber-300">înainte ca întrebările să înceapă</strong>). Pe Joker, alegi runda și prezici câte puncte vei face (de ex. 7 puncte).
                    </p>
                    <div className="mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-800/40 text-[11px] text-amber-300 font-medium space-y-2">
                      <p>⚡ Dacă faci cel puțin numărul prezis (x), mai primești încă x puncte. Dacă nu atingi numărul de puncte prezis, nu primești niciun punct bonus.</p>
                      <p className="text-emerald-400 font-bold">✨ Dacă prezici 10 și reușești să aduni 10 puncte, punctajul se triplează (primești 20 puncte bonus)!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Gamble */}
              <div className="p-2 rounded-[2rem] bg-purple-950/20 ring-1 ring-purple-500/30 shadow-xl">
                <div className="p-6 rounded-[calc(2rem-0.5rem)] bg-[#0e041d] h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl mb-4">
                      🎲
                    </div>
                    <h3 className="text-xl font-heading text-purple-200 tracking-wide mb-2">
                      PARIUL
                    </h3>
                    <p className="text-xs text-purple-200/80 leading-relaxed">
                      După cele 5 runde, urmează o întrebare bonus mult mai dificilă, cu 4 variante de răspuns (A, B, C, D). Poți paria între 2 și 20 de puncte din punctele acumulate pe parcursul celor 5 runde.
                    </p>
                    <div className="mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-800/40 text-[11px] text-purple-300 font-medium">
                      ⚠️ Dacă răspunzi corect, miza pariată se dublează! Dacă greșești, pierzi tot ce ai pariat. Ai grijă!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: REGULAMENT SKELETON */}
          <TabsContent value="mechanics" className="space-y-6">
            <div className="p-8 sm:p-12 rounded-[2.5rem] bg-purple-950/20 ring-1 ring-purple-800/40 shadow-xl">
              <div className="max-w-3xl mx-auto space-y-10">
                <div className="border-b border-purple-800/50 pb-6">
                  <h3 className="text-2xl font-heading text-white tracking-wide">1. Reguli Generale</h3>
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-full bg-purple-900/30 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-purple-900/30 rounded animate-pulse"></div>
                    <div className="h-4 w-4/6 bg-purple-900/30 rounded animate-pulse"></div>
                  </div>
                </div>
                
                <div className="border-b border-purple-800/50 pb-6">
                  <h3 className="text-2xl font-heading text-white tracking-wide">2. Sistemul de Punctare & Echipe</h3>
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-11/12 bg-purple-900/30 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-purple-900/30 rounded animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-purple-900/30 rounded animate-pulse"></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-heading text-white tracking-wide">3. Codul de Onoare</h3>
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-full bg-purple-900/30 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-purple-900/30 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: THEME VALIDATOR TOOL */}
          <TabsContent value="validator">
            <ThemeValidator />
          </TabsContent>

        </Tabs>

      </div>
    </section>
  );
}
