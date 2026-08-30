import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Smartphone, 
  Sparkles, 
  Coins, 
  RefreshCw, 
  Trophy, 
  PartyPopper,
  Brain,
  Image,
  Music,
  Target,
  Coffee,
  ShieldAlert,
  Flame,
  CheckCircle2
} from "lucide-react";
import ThemeValidator from "./ThemeValidator";

interface RulebookSectionProps {
  editionId?: string;
}

export default function RulebookSection({ editionId }: RulebookSectionProps) {
  const [activeTab, setActiveTab] = useState("rules");

  const rulesList = [
    {
      id: "rule-1",
      number: "01",
      title: "Regula de Aur: Fără Telefoane!",
      icon: Smartphone,
      badge: "Integritate & Onoare",
      desc: "Toate telefoanele, smartwatch-urile și dispozitivele conectate rămân în buzunare sau în genți pe toată durata rundelor de întrebări. Folosirea asistenței digitale atrage descalificarea imediată a echipei din runda respectivă.",
    },
    {
      id: "rule-2",
      number: "02",
      title: "Mecanica Cardului 'Joker' (x2 Puncte)",
      icon: Sparkles,
      badge: "Punctaj Dublu",
      desc: "Fiecare echipă primește un singur card fizic Joker pe seară. Înainte de începerea oricăreia dintre Rundele 1-5, căpitanul poate alege să joace Joker-ul. Toate punctele obținute de echipă în runda aleasă se dublează automat!",
    },
    {
      id: "rule-3",
      number: "03",
      title: "Pariul Final (The Final Gamble)",
      icon: Coins,
      badge: "Totul sau Nimic",
      desc: "La finalul celor 5 runde se joacă o singură întrebare legendară de dificultate maximă. Echipele pot paria orice număr de puncte acumulate (de la 0 până la întregul punctaj). Răspunsul corect adaugă punctele pariate, iar cel greșit le scade!",
    },
    {
      id: "rule-4",
      number: "04",
      title: "Sistemul 'Schimbă & Corectează'",
      icon: RefreshCw,
      badge: "Corectitudine",
      desc: "După fiecare bloc de întrebări, foile de răspuns sunt schimbate între mesele vecine pentru verificare reciprocă. Se acordă 1 punct pentru fiecare răspuns corect și 0.5 puncte pentru răspunsuri parțiale justificate de Quizmaster.",
    },
    {
      id: "rule-5",
      number: "05",
      title: "Ultimul Loc Alege Tema Săptămânii Viitoare",
      icon: Trophy,
      badge: "Răzbunarea Pierzătorilor",
      desc: "Echipa care ocupă ultimul loc în clasamentul serii primește privilegiul de a alege tema uneia dintre rundele speciale din ediția următoare (folosind validatorul nostru de teme).",
    },
    {
      id: "rule-6",
      number: "06",
      title: "Spirit de Joc & Distracție la Insomnia",
      icon: PartyPopper,
      badge: "Atmosferă Boemă",
      desc: "Trivia este înainte de toate o sărbătoare a inteligenței, a bunei dispoziții, a vinului bun și a prieteniei. Respectați gazdele, adversarii și bucurați-vă de spectacol!",
    },
  ];

  const roundsFormat = [
    { num: 1, name: "Cultură Generală", count: "10 Întrebări", icon: Brain, color: "text-emerald-400", desc: "Încălzirea serii cu întrebări diverse din știință, istorie și curiozități pentru a intra în ritm." },
    { num: 2, name: "Legătura Vizuală", count: "10 Întrebări", icon: Image, color: "text-blue-400", desc: "Identificarea legăturii secrete sau a elementului comun dintre imagini, postere și opere de artă." },
    { num: 3, name: "Continuă Versurile & Runda Audio", count: "10 Melodii", icon: Music, color: "text-purple-400", desc: "15-20 secunde dintr-un hit celebru, urmate de continuarea versului sau ghicirea artistului." },
    { num: 4, name: "Pauză de Strategie (15 min)", count: "Pauză", icon: Coffee, color: "text-amber-400", desc: "Timp pentru completarea carnetului de băuturi, calcularea clasamentului provizoriu și decizia pentru Joker." },
    { num: 5, name: "Runda Tematică a Săptămânii", count: "10 Întrebări", icon: Target, color: "text-pink-400", desc: "Tema specială anunțată în avans sau aleasă de echipa de pe ultimul loc din ediția anterioară." },
    { num: 6, name: "Runda Fulger / Specială", count: "10 Întrebări", icon: Flame, color: "text-red-400", desc: "Întrebări rapide, provocări de logică și dueluri directe de cunoștințe." },
    { num: 7, name: "Final Gamble (Pariul Suprem)", count: "1 Întrebare Mistică", icon: Coins, color: "text-amber-300", desc: "Momentul decisiv al serii care poate răsturna complet clasamentul și decide câștigătorii premiilor!" },
  ];

  return (
    <section id="rulebook" className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Title */}
        <div className="text-center mb-8">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs px-3 py-1 font-semibold uppercase tracking-wider mb-2">
            Ghidul Oficial al Jucătorului
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading tracking-widest text-gold-gradient">
            REGULAMENT & VALIDATOR DE TEME
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-1">
            Tot ce trebuie să știi despre desfășurarea serii de marți la Insomnia Restaurant
          </p>
        </div>

        {/* Tabs Control */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 bg-purple-950/80 border border-purple-700/50 p-1 mb-8 max-w-xl mx-auto">
            <TabsTrigger value="rules" className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading tracking-wider text-xs sm:text-sm py-2">
              Reguli & Mecanici
            </TabsTrigger>
            <TabsTrigger value="format" className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading tracking-wider text-xs sm:text-sm py-2">
              Structura Rundelor
            </TabsTrigger>
            <TabsTrigger value="validator" className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading tracking-wider text-xs sm:text-sm py-2">
              Validator Teme
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: RULES */}
          <TabsContent value="rules" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rulesList.map((rule) => {
                const Icon = rule.icon;
                return (
                  <Card key={rule.id} className="gold-card border border-purple-700/40 p-5 rounded-xl hover:border-amber-400/50 transition-all">
                    <CardContent className="p-0 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-900/60 border border-amber-400/30 flex items-center justify-center font-heading text-xl text-amber-300 flex-shrink-0 shadow">
                        {rule.number}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-heading text-lg text-white">{rule.title}</h3>
                          <Badge variant="outline" className="border-purple-600/40 text-purple-300 text-[10px]">
                            {rule.badge}
                          </Badge>
                        </div>
                        <p className="text-xs text-purple-200/80 leading-relaxed">{rule.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: FORMAT */}
          <TabsContent value="format" className="space-y-3">
            {roundsFormat.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.num}
                  className="gold-card rounded-xl p-4 border border-purple-700/40 flex items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-purple-900/60 border border-purple-600/40 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-5 h-5 ${r.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-base sm:text-lg text-white">{r.name}</span>
                        <Badge className="bg-purple-900/60 border-purple-600/40 text-purple-200 text-[10px]">
                          {r.count}
                        </Badge>
                      </div>
                      <p className="text-xs text-purple-200/80 mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                  <span className="font-heading text-2xl text-amber-400/50 font-bold hidden sm:block">
                    0{r.num}
                  </span>
                </div>
              );
            })}
          </TabsContent>

          {/* TAB 3: THEME VALIDATOR */}
          <TabsContent value="validator">
            <ThemeValidator editionId={editionId} />
          </TabsContent>

        </Tabs>

      </div>
    </section>
  );
}
