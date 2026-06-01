import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, TrendingUp } from "lucide-react";

export default function JackpotSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider"
          data-testid="text-jackpot-title"
        >
          JACKPOT-UL
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Premiul suprem pentru excelență la trivia
        </p>
        
        <Card className="border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mb-6">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
              
              <div className="font-display text-6xl md:text-7xl text-amber-400 mb-4" data-testid="text-jackpot-amount">
                1000 LEI
              </div>
              
              <h3 className="font-heading text-2xl tracking-wider mb-6">
                MARELE PREMIU
              </h3>
              
              <div className="max-w-lg space-y-4">
                <div className="flex items-center gap-3 justify-center text-muted-foreground">
                  {/* Swapped text-cyan-400 to text-purple-400 to match the brand identity */}
                  <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <p>Echipa cu cel mai mare punctaj cumulat la toate serile de quiz ale sezonului câștigă!</p>
                </div>
                <div className="flex items-center gap-3 justify-center text-muted-foreground">
                  <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <p>Câștigătorul va fi anunțat la sfârșitul lunii iulie</p>
                </div>
              </div>
              
              <p className="mt-8 text-sm text-amber-400/80 font-medium">
                Joacă în fiecare marți pentru a-ți maximiza punctele și a câștiga jackpot-ul!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
