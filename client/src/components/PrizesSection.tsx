import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Wine, Beer, Sparkles, MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

export default function PrizesSection() {
  const prizes = [
    {
      place: "1",
      rankTitle: "LOCUL 1 • MARELE TROFEU",
      title: "O Sticlă de Vin Nobil & Glorie Eternă",
      desc: "Sărbătoriți victoria cu vin fin din cele mai renumite podgorii transilvănene și puncte maxime în clasamentul sezonului.",
      image: "/prize_wine.png",
      borderColor: "border-amber-400/60",
      glowColor: "shadow-[0_0_40px_rgba(246,184,40,0.3)]",
      badgeClass: "bg-amber-400 text-purple-950 font-bold",
    },
    {
      place: "2",
      rankTitle: "LOCUL 2 • ARGINTUL",
      title: "O Găleată de Bere Rece",
      desc: "O recompensă generoasă și răcoritoare pentru întreaga echipă, pe deplin meritată pentru bătălia strânsă de la vârf.",
      image: "/prize_beer.png",
      borderColor: "border-purple-400/50",
      glowColor: "shadow-[0_0_35px_rgba(168,85,247,0.25)]",
      badgeClass: "bg-purple-600 text-white font-bold",
    },
    {
      place: "3",
      rankTitle: "LOCUL 3 • BRONZUL",
      title: "O Rundă de Shot-uri din Partea Casei",
      desc: "Întreaga echipă ciocnește shot-uri speciale pregătite de barmanii de la Insomnia pentru podiumul serii!",
      image: "/prize_shots.png",
      borderColor: "border-amber-600/40",
      glowColor: "shadow-[0_0_30px_rgba(217,119,6,0.2)]",
      badgeClass: "bg-amber-700/80 text-amber-100 font-bold",
    },
  ];

  return (
    <section id="prizes" className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Title */}
        <div className="text-center mb-12">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs px-3 py-1 font-semibold uppercase tracking-wider mb-2">
            Recompensele Învingătorilor
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading tracking-widest text-gold-gradient">
            PREMIILE SERII & LOCAȚIA
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-1">
            Fiecare marți aduce băuturi fine, shot-uri pentru echipă și puncte prețioase în clasamentul general al Sezonului.
          </p>
        </div>

        {/* 3 Prizes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {prizes.map((prize) => (
            <Card
              key={prize.place}
              className={`gold-card rounded-2xl border-2 ${prize.borderColor} ${prize.glowColor} overflow-hidden hover:scale-102 transition-transform duration-300`}
            >
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
                <Badge className={`${prize.badgeClass} text-xs tracking-wider px-3 py-1 mb-4 uppercase`}>
                  {prize.rankTitle}
                </Badge>

                {/* Sticker / Prize Art Asset */}
                <div className="relative w-32 h-32 my-3 flex items-center justify-center">
                  <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl" />
                  <img
                    src={prize.image}
                    alt={prize.title}
                    className="relative max-h-28 w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] hover:rotate-3 transition-transform"
                  />
                </div>

                <h3 className="font-heading text-2xl text-white mt-2 mb-2 tracking-wide">
                  {prize.title}
                </h3>
                <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
                  {prize.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Venue Information Box */}
        <div className="gold-card rounded-3xl p-8 border border-amber-400/40 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300 font-bold mb-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Gazda Noastră Tradițională
              </div>
              <h3 className="text-3xl sm:text-4xl font-heading text-gold-gradient mb-3">
                INSOMNIA RESTAURANT & CAFÉ
              </h3>
              <p className="text-sm text-purple-200/90 leading-relaxed mb-4">
                Situat chiar în inima Clujului pe strada Universității, Insomnia este spațiul emblematic unde atmosfera boemă, berile artizanale, cocktailurile misterioase și spiritul ludic se unesc în fiecare marți seară.
              </p>
              
              <div className="space-y-2 text-xs text-purple-200">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>Strada Universității nr. 2, Cluj-Napoca, România</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-400" />
                  <span>Rezervări speciale: +40 264 430 044</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wine className="w-4 h-4 text-purple-400" />
                  <span>Program Trivia: În fiecare Marți, deschidere 19:30 | Start Concurs 20:00</span>
                </div>
              </div>
            </div>

            {/* Visual Location Frame */}
            <div className="relative rounded-2xl overflow-hidden border border-purple-600/50 shadow-[0_0_30px_rgba(0,0,0,0.8)] aspect-video bg-purple-950/60 flex items-center justify-center p-6 text-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-950 via-[#19082c] to-amber-950/40 opacity-90" />
              <div className="relative z-10 space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-300">
                  <Wine className="w-6 h-6" />
                </div>
                <div className="font-heading text-xl text-white">ATMOSFERĂ BOEMĂ & BĂUTURI SPECIALE</div>
                <p className="text-xs text-purple-300/80 max-w-xs mx-auto">
                  Meniul include preparate delicioase, bere artizanală, vinuri alese și cocktailuri tematice.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
