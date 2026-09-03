import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Wine, 
  Beer, 
  GlassWater, 
  MapPin, 
  Clock, 
  Sparkles, 
  Crown,
  Flame,
  Award
} from "lucide-react";

export default function PrizesSection() {
  const prizes = [
    {
      place: "LOCUL I",
      title: "Sticlă de Vin",
      desc: "Vă puteți alege vinul preferat: alb, roșu sau rosé.",
      image: "/prize_wine.png",
      badgeColor: "bg-amber-400 text-purple-950",
      borderColor: "ring-2 ring-amber-400/80 shadow-[0_0_35px_rgba(246,184,40,0.4)]",
      bgGradient: "from-amber-500/20 via-purple-900/20 to-[#0e041d]",
      glowClass: "drop-shadow-[0_0_10px_rgba(246,184,40,0.8)] border border-amber-300",
      icon: Crown,
    },
    {
      place: "LOCUL II",
      title: "Găleată de Bere",
      desc: "O găleată cu beri reci pentru toți membrii echipei de pe locul secund pe podium.",
      image: "/prize_beer.png",
      badgeColor: "bg-gray-300 text-purple-950",
      borderColor: "ring-2 ring-gray-400/70 shadow-[0_0_30px_rgba(156,163,175,0.4)]",
      bgGradient: "from-gray-500/20 via-purple-900/15 to-[#0e041d]",
      glowClass: "drop-shadow-[0_0_10px_rgba(156,163,175,0.8)] border border-gray-200",
      icon: Award,
    },
    {
      place: "LOCUL III",
      title: "Rând de Shot-uri",
      desc: "Un rând de shot-uri la barul Insomnia pentru a sărbători bronzul.",
      image: "/prize_shots.png",
      badgeColor: "bg-[#CD7F32] text-white",
      borderColor: "ring-2 ring-[#CD7F32]/70 shadow-[0_0_30px_rgba(205,127,50,0.4)]",
      bgGradient: "from-[#CD7F32]/20 via-purple-950/15 to-[#0e041d]",
      glowClass: "drop-shadow-[0_0_10px_rgba(205,127,50,0.8)] border border-[#CD7F32]",
      icon: Trophy,
    },
  ];

  return (
    <section id="prizes" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 mb-3 shadow-[0_0_15px_rgba(246,184,40,0.15)]">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Glorie & Recompense
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading tracking-widest text-gold-gradient py-1">
            PREMIILE SĂPTĂMÂNALE
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-2 font-light">
            La fiecare ediție de marți, primele 3 echipe sunt premiate la Insomnia Cafe & Bistro!
          </p>
        </div>

        {/* Prizes Cards (Double-Bezel Architecture) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {prizes.map((p) => {
            const Icon = p.icon;
            return (
              <div 
                key={p.place}
                className={`p-2 rounded-[2.5rem] bg-gradient-to-b ${p.bgGradient} ${p.borderColor} transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between`}
              >
                <div className="p-6 rounded-[calc(2.5rem-0.5rem)] bg-[#0d041a] h-full flex flex-col items-center text-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                  
                  {/* Badge */}
                  <Badge className={`${p.badgeColor} ${p.glowClass} px-6 py-2 text-sm sm:text-base font-extrabold tracking-widest uppercase mb-4 shadow-xl`}>
                    {p.place}
                  </Badge>

                  {/* Sticker Graphic */}
                  <div className="relative w-40 h-40 my-3 flex items-center justify-center group">
                    <div className="absolute inset-0 bg-amber-400/10 rounded-full blur-xl group-hover:bg-amber-400/20 transition-all duration-500" />
                    <img
                      src={p.image}
                      alt={p.title}
                      className="relative w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="font-heading text-lg sm:text-xl text-white tracking-wide mb-2 leading-snug">
                      {p.title}
                    </h3>
                    <p className="text-xs text-purple-300/80 leading-relaxed font-light">
                      {p.desc}
                    </p>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Jackpot Section */}
        <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/20 via-purple-900/10 to-[#0e041d] ring-2 ring-amber-400/50 shadow-[0_0_40px_rgba(246,184,40,0.2)] mb-16 mx-auto max-w-4xl">
          <div className="p-6 sm:p-10 rounded-[calc(2.5rem-0.5rem)] bg-[#0d041a] flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center sm:justify-start gap-2 text-amber-400 text-sm font-bold uppercase tracking-widest w-full">
                <Crown className="w-5 h-5" />
                Jackpot-ul Sezonului
              </div>
              <p className="text-purple-200 font-light max-w-md mx-auto sm:mx-0">
                Marele premiu pentru câștigătorii sezonului, acordat echipei cu cel mai mare punctaj adunat.
              </p>
            </div>
            <div className="px-8 py-4 rounded-2xl bg-amber-400/10 border border-amber-400/40 text-amber-400 font-heading text-4xl sm:text-5xl shadow-[0_0_25px_rgba(246,184,40,0.3)] drop-shadow-[0_0_10px_rgba(246,184,40,0.8)] flex-shrink-0">
              1000 LEI
            </div>
          </div>
        </div>

        {/* Venue Information (Double-Bezel Shell) */}
        <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-purple-900/20 to-purple-950/10 ring-1 ring-purple-500/30 shadow-2xl">
          <div className="p-8 sm:p-12 rounded-[calc(2.5rem-0.5rem)] bg-[#0e041d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center md:justify-start gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider w-full">
                <MapPin className="w-4 h-4" />
                Locația Oficială a Concursului
              </div>
              <h3 className="text-2xl sm:text-3xl font-heading text-white tracking-wide">
                INSOMNIA CAFE & BISTRO
              </h3>
              <p className="text-xs sm:text-sm text-purple-300/80 max-w-lg leading-relaxed font-light mx-auto md:mx-0">
                Str. Universității nr. 2 (la etaj). Bericică rece, mâncare delicioasă și cea mai caldă comunitate de trivia din Cluj!
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2 flex-shrink-0">
              <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-800/50 text-center md:text-right w-full">
                <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Ora Începerii</div>
                <div className="font-heading text-2xl text-amber-300">Marți la 20:00</div>
                <div className="text-[11px] text-purple-400 mt-0.5">Sosirea echipelor: 19:45</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
