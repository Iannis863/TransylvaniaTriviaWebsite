import { Card, CardContent } from "@/components/ui/card";
import { Timer, Sparkles, Coffee } from "lucide-react";

export default function SeasonAnnouncement() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider uppercase"
          data-testid="text-announcement-title"
        >
          Season Intermission
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Refining the intelligence. Preparing the next challenge.
        </p>
        
        <Card className="border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center mb-6">
                <Timer className="w-10 h-10 text-purple-400" />
              </div>
              
              <div className="font-display text-5xl md:text-6xl text-purple-400 mb-4 uppercase tracking-tighter">
                Season 2 Incoming
              </div>
              
              <h3 className="font-heading text-2xl tracking-widest mb-6 text-white/90">
                APRIL 21, 2026
              </h3>
              
              <div className="max-w-lg space-y-4">
                <div className="flex items-center gap-3 justify-center text-muted-foreground">
                  <Coffee className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <p>We are taking a 2-week hiatus for the Easter holidays.</p>
                </div>
                <div className="flex items-center gap-3 justify-center text-muted-foreground">
                  <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <p>Sharpen your wits—Season 2 brings new mechanics and higher stakes.</p>
                </div>
              </div>
              
              <div className="mt-10 px-6 py-2 rounded-full border border-purple-500/20 bg-purple-500/10 text-xs uppercase tracking-[0.2em] text-purple-300 font-bold">
                TransylvaniaTrivia • The Elite Standard
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
