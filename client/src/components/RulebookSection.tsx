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
      name: "Încălzirea Minții (General Trivia)",
      questions: "10 Întrebări",
      points: "1 punct / răspuns corect",
      desc: "Întrebări diverse din cultură generală, știință, geografie și istorie universală pentru a porni motoarele echipei.",
      jokerEligible: true,
    },
    {
      number: "2",
      name: "Runda Tematică a Ediției",
      questions: "10 Întrebări",
      points: "1 punct / răspuns corect",
      desc: "Dedicată în totalitate temei săptămânale. (Propusă adesea de echipa clasată pe ultimul loc la ediția precedentă!)",
      jokerEligible: true,
    },
    {
      number: "3",
      name: "Misterul Transilvaniei & Conexiuni",
      questions: "10 Întrebări",
      points: "1 punct / răspuns corect",
      desc: "Misterele castelelor, legende transilvănene, personalități din Cluj și ghicitori vizuale.",
      jokerEligible: true,
    },
    {
      number: "4",
      name: "Audio-Video & Pop Culture",
      questions: "10 Întrebări (Fragmente)",
      points: "1 punct / răspuns corect",
      desc: "Recunoaște coloana sonoră, melodia derulată invers, replica celebră sau cadrul dintr-un film iconic.",
      jokerEligible: true,
    },
    {
      number: "5",
      name: "Final Gamble (Miza Supremă)",
      questions: "5 Întrebări de Dificultate Înaltă",
      points: "Pariu variabil (-2 până la +4 puncte)",
      desc: "Fiecare echipă pariază puncte înainte de răspuns. Un răspuns corect aduce punctajul pariat; un răspuns greșit scade punctajul pariat din total!",
      jokerEligible: false,
    },
  ];

  return (
    <section id="rulebook" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Codul de Onoare & Mecanici
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading tracking-widest text-gold-gradient">
            REGULAMENTUL OFICIAL
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-2 font-light">
            Descoperă structura celor 5 runde, puterea cardului Joker și validatorul algoritmic de teme.
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
                Cele 5 Runde
              </TabsTrigger>
              <TabsTrigger
                value="mechanics"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                Joker & Reguli Speciale
              </TabsTrigger>
              <TabsTrigger
                value="validator"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                Validator Teme Noi
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: ROUNDS BREAKDOWN */}
          <TabsContent value="rounds" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {rounds.map((round) => (
                <div
                  key={round.number}
                  className="p-1 rounded-2xl bg-purple-950/20 border border-purple-800/40 hover:border-amber-400/40 transition-all shadow-md"
                >
                  <div className="p-5 rounded-xl bg-[#0f041e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-purple-950 font-heading text-xl font-bold flex items-center justify-center shadow flex-shrink-0">
                        R{round.number}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading text-lg text-white tracking-wide">{round.name}</h3>
                          {round.jokerEligible ? (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px]">
                              JOKER APLICABIL (x2)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-purple-300 text-[10px]">
                              FĂRĂ JOKER
                            </Badge>
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
          </TabsContent>

          {/* TAB 2: SPECIAL MECHANICS */}
          <TabsContent value="mechanics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Joker Card */}
              <div className="p-2 rounded-[2rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-xl">
                <div className="p-6 rounded-[calc(2rem-0.5rem)] bg-[#0e041d] h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl mb-4">
                      🃏
                    </div>
                    <h3 className="text-xl font-heading text-gold-gradient tracking-wide mb-2">
                      CARDUL STRATEGIC JOKER (x2)
                    </h3>
                    <p className="text-xs text-purple-200/80 leading-relaxed space-y-2">
                      Fiecare echipă primește un singur card Joker la începutul serii. Căpitanul poate juca Jokerul pe <strong className="text-amber-300">oricare din Rundele 1 - 4</strong> înainte de citirea primei întrebări din runda respectivă.
                    </p>
                    <div className="mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-800/40 text-[11px] text-amber-300 font-medium">
                      ⚡ Toate punctele obținute în runda aleasă se DUBLEAZĂ automat!
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
                      MECANICA FINAL GAMBLE
                    </h3>
                    <p className="text-xs text-purple-200/80 leading-relaxed">
                      În Runda 5, după anunțarea categoriei întrebării, echipa alege câte puncte pariază din zestrea adunată. Răspunsurile corecte adaugă punctele; cele greșite sau lipsă le deduc fără milă!
                    </p>
                    <div className="mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-800/40 text-[11px] text-purple-300 font-medium">
                      ⚠️ Miza poate propulsa o echipă de pe locul 5 direct pe podium!
                    </div>
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
