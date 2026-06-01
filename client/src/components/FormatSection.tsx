import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Image, Music, Target, Skull, Coffee, Coins } from "lucide-react";

const rounds = [
  {
    id: "round1",
    name: "Cultură Generală",
    description: "Încălzirea cu întrebări mai ușoare pentru ca toată lumea să prindă încredere și să intre în atmosferă.",
    icon: Brain,
    questions: 10,
    color: "border-green-500/30",
    iconColor: "text-green-400",
  },
  {
    id: "round2",
    name: "Legătura dintre Imagini",
    description: "Identifică legătura dintre 2 imagini. E timpul să îți folosești memoria vizuală și deducția logică!",
    icon: Image,
    questions: 10,
    color: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    id: "round3",
    name: "Continuă Versurile",
    description: "Asculți 15-20 de secunde dintr-o melodie, apoi continui versurile. Runda preferată a tuturor!",
    icon: Music,
    questions: 10,
    color: "border-pink-500/30",
    iconColor: "text-pink-400",
  },
  {
    id: "break",
    name: "Pauză",
    description: "15 minute pentru a lua băuturi, a discuta strategia și a vă pregăti pentru rundele finale!",
    icon: Coffee,
    questions: null,
    color: "border-amber-500/30",
    iconColor: "text-amber-400",
    isBreak: true,
  },
  {
    id: "round4",
    name: "Runda Tematică 1",
    description: "O temă diferită în fiecare săptămână – cum ar fi 'Anii 2000', 'AI & Tehnologie', 'Geografie' și multe altele!",
    icon: Target,
    questions: 10,
    color: "border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
  {
    id: "round5",
    name: "Runda Tematică 2",
    description: "O altă temă pentru a vă testa cunoștințele specializate!",
    icon: Target,
    questions: 10,
    color: "border-red-500/30",
    iconColor: "text-red-400",
  },
  {
    id: "break2",
    name: "Pauză",
    description: "15 minute pentru a pune la punct strategia pentru miza finală!",
    icon: Coffee,
    questions: null,
    color: "border-amber-500/30",
    iconColor: "text-amber-400",
    isBreak: true,
  },
  {
    id: "final",
    name: "Pariul",
    description: "O singură întrebare incredibil de grea. Pariază-ți punctele strategic – te așteaptă gloria sau eșecul!",
    icon: Coins,
    questions: 1,
    color: "border-purple-500/30",
    iconColor: "text-purple-400",
    isFinal: true,
  },
];

export default function FormatSection() {
  return (
    <section id="format" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider"
          data-testid="text-format-title"
        >
          FORMATUL QUIZ-ULUI
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Cinci runde de glorie trivia și o întrebare finală legendară
        </p>
        
        <div className="relative space-y-4">
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-500 via-cyan-500 to-amber-500 hidden md:block" />
          
          {rounds.map((round, index) => (
            <Card 
              key={round.id}
              className={`relative border ${round.color} md:ml-12 ${round.isBreak ? 'bg-amber-500/5' : ''} ${round.isFinal ? 'bg-purple-500/5' : ''}`}
              data-testid={`card-format-${round.id}`}
            >
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-2 border-purple-500 hidden md:flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              
              <CardContent className="p-6 flex flex-wrap gap-4 items-start">
                <div className={`w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0`}>
                  <round.icon className={`w-6 h-6 ${round.iconColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-heading text-xl tracking-wide">{round.name}</h3>
                    {round.questions !== null && (
                      <Badge variant="outline" className="text-xs">
                        {round.questions} {round.questions === 1 ? 'Întrebare' : 'Întrebări'}
                      </Badge>
                    )}
                    {round.isBreak && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        15 min
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{round.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
