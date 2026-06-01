import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Joystick, Coins, PartyPopper, Ticket, Trophy, RefreshCw } from "lucide-react";

const rules = [
  {
    number: 1,
    title: "Fără Telefoane",
    description: "Țineți dispozitivele la distanță. Aceasta este o bătălie a minții, nu a abilităților de căutare pe Google!",
    icon: Smartphone,
  },
  {
    number: 2,
    title: "Cardul Joker",
    description: "5 runde cu câte 10 întrebări fiecare. Folosiți cardul Joker înainte de orice rundă pentru a aduna mai multe puncte în runda respectivă!",
    icon: Joystick,
  },
  {
    number: 3,
    title: "Pariul",
    description: "Întrebarea finală este cea mai importantă. Pariați orice sumă din punctele voastre – dublați sau pierdeți totul!",
    icon: Coins,
  },
  {
    number: 4,
    title: "Schimbă & Corectează",
    description: "Echipele scriu răspunsurile pe foaie, apoi fac schimb cu vecinii pentru verificare. La final, se dă foaia înapoi pentru confirmare și se predă înainte de pauză.",
    icon: RefreshCw,
  },
  {
    number: 5,
    title: "Ultimul Loc Alege",
    description: "Echipa de pe ultimul loc are ocazia să aleagă una dintre rundele tematice pentru săptămâna viitoare!",
    icon: Trophy,
  },
  {
    number: 6,
    title: "Distrează-te!",
    description: "Cea mai importantă este distracția alături de prieteni. Bucurați-vă de competiție!",
    icon: PartyPopper,
  },
];

export default function RulesSection() {
  return (
    <section className="py-20 px-4 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider"
          data-testid="text-rules-title"
        >
          REGULAMENTUL
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">
          Reguli simple pentru distracție maximă
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule) => (
            <Card 
              key={rule.number}
              className="border border-border"
              data-testid={`card-rule-${rule.number}`}
            >
              <CardContent className="p-6 flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <span className="font-heading text-xl text-purple-400">{rule.number}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Swapped text-cyan-400 to text-purple-400 to complete the purple brand shift */}
                    <rule.icon className="w-5 h-5 text-purple-400" />
                    <h3 className="font-heading text-xl tracking-wide">{rule.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">{rule.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
