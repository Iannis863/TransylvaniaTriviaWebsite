import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wine, Beer, Sparkles } from "lucide-react";

const prizes = [
  {
    place: "1",
    title: "O Sticlă de Vin",
    description: "Deschideți vinul și sărbătoriți victoria!",
    icon: Wine,
    color: "text-yellow-400",
    borderColor: "border-yellow-400/30",
    bgGlow: "shadow-[0_0_30px_rgba(250,204,21,0.15)]",
  },
  {
    place: "2",
    title: "O găleată de Bere",
    description: "O recompensă rece, pe deplin meritată pentru locul 2.",
    icon: Beer,
    color: "text-gray-300",
    borderColor: "border-gray-300/30",
    bgGlow: "shadow-[0_0_30px_rgba(209,213,219,0.1)]",
  },
  {
    place: "3",
    title: "Shot-uri pentru Toți",
    description: "Întreaga echipă primește o rundă de shot-uri din partea casei!",
    icon: Sparkles,
    color: "text-amber-600",
    borderColor: "border-amber-600/30",
    bgGlow: "shadow-[0_0_30px_rgba(217,119,6,0.1)]",
  },
];

export default function PrizesSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider"
          data-testid="text-prizes-title"
        >
          PREMII
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Luptă pentru glorie și pleacă acasă cu recompense legendare
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {prizes.map((prize, index) => (
            <Card 
              key={prize.place}
              className={`relative border ${prize.borderColor} ${prize.bgGlow}`}
              data-testid={`card-prize-${index + 1}`}
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <Badge 
                  variant="outline" 
                  className={`${prize.color} border-current text-lg px-4 py-1 font-heading tracking-wider`}
                >
                  LOCUL {prize.place}
                </Badge>
                <prize.icon className={`w-16 h-16 ${prize.color}`} />
                <h3 className="font-heading text-2xl tracking-wide">{prize.title}</h3>
                <p className="text-muted-foreground text-sm">{prize.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
