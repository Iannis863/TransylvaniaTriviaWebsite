import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Coins, RefreshCw } from "lucide-react";

const mechanics = [
  {
    id: "joker",
    title: "Joker-ul",
    description: "Fiecare echipă primește un card fizic Joker. Jucați-l înainte de începerea oricărei runde pentru a DUBLA toate punctele obținute în acea rundă. Folosiți-l cu înțelepciune – aveți doar unul singur!",
    icon: Sparkles,
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/5",
  },
  {
    id: "gamble",
    title: "Miza Finală",
    description: "Întrebarea decisivă. Pariați orice sumă din punctele voastre totale. Răspundeți corect și dublați miza, răspundeți greșit și pierdeți totul. Risc mare, recompensă pe măsură!",
    icon: Coins,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/5",
  },
  {
    id: "swap",
    title: "Schimbă & Corectează",
    description: "Sistem clasic de corectare: echipele scriu răspunsurile pe foaie, apoi fac schimb cu vecinii pentru verificare. La final, se dă foaia înapoi pentru confirmare și se predă înainte de pauză.",
    icon: RefreshCw,
    // Swapped cyan classes to matching purple classes to blend with the new theme
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/5",
  },
];

export default function MechanicsSection() {
  return (
    <section className="py-20 px-4 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider"
          data-testid="text-mechanics-title"
        >
          REGULI SPECIALE
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Elemente unice de joc care fac ca seara noastră de quiz să fie de neuitat
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mechanics.map((mechanic) => (
            <Card 
              key={mechanic.id}
              className={`border ${mechanic.borderColor} ${mechanic.bgColor}`}
              data-testid={`card-mechanic-${mechanic.id}`}
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className={`w-16 h-16 rounded-full bg-background border ${mechanic.borderColor} flex items-center justify-center`}>
                  <mechanic.icon className={`w-8 h-8 ${mechanic.color}`} />
                </div>
                <h3 className={`font-heading text-2xl tracking-wide ${mechanic.color}`}>
                  {mechanic.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {mechanic.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
