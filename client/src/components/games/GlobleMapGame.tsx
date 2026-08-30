import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, Compass, Sparkles, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GlobleMapGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

interface Location {
  name: string;
  county: string;
  lat: number;
  lng: number;
  clue: string;
}

const TARGET_LOCATION: Location = {
  name: "Sighișoara",
  county: "Mureș",
  lat: 46.2167,
  lng: 24.7833,
  clue: "Singura cetate medievală locuită din Europa de Est și locul nașterii lui Vlad Țepeș.",
};

const OPTIONS: Location[] = [
  { name: "Cluj-Napoca", county: "Cluj", lat: 46.7712, lng: 23.6236, clue: "Inima culturală și academică a Transilvaniei." },
  { name: "Brașov", county: "Brașov", lat: 45.6579, lng: 25.6012, clue: "Orașul de sub Tâmpa cu celebra Biserică Neagră." },
  { name: "Sibiu", county: "Sibiu", lat: 45.7983, lng: 24.1256, clue: "Capitală Culturală Europeană și Podul Minciunilor." },
  { name: "Sighișoara", county: "Mureș", lat: 46.2167, lng: 24.7833, clue: "Turnul cu Ceas și misterul cetății medievale." },
  { name: "Alba Iulia", county: "Alba", lat: 46.0686, lng: 23.5719, clue: "Cetatea Alba Carolina și sala Marii Uniri." },
  { name: "Hunedoara", county: "Hunedoara", lat: 45.7533, lng: 22.9067, clue: "Castelul Corvinilor, bijuteria gotică transilvăneană." },
];

export default function GlobleMapGame({ onSolve, isAlreadySolved = false }: GlobleMapGameProps) {
  const { toast } = useToast();
  const [guesses, setGuesses] = useState<{ loc: Location; distanceKm: number }[]>(
    isAlreadySolved ? [{ loc: TARGET_LOCATION, distanceKm: 0 }] : []
  );
  const [isWon, setIsWon] = useState(isAlreadySolved);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const handleGuess = (loc: Location) => {
    if (isWon) return;
    const distanceKm = calculateDistance(loc.lat, loc.lng, TARGET_LOCATION.lat, TARGET_LOCATION.lng);
    const newGuesses = [ { loc, distanceKm }, ...guesses ];
    setGuesses(newGuesses);

    if (distanceKm === 0) {
      setIsWon(true);
      toast({ title: "🎉 Locație Găsită!", description: `Ai identificat corect ${TARGET_LOCATION.name}!` });
      onSolve({ completed: true, target: TARGET_LOCATION.name });
    } else {
      toast({ title: `${loc.name} este la ${distanceKm} km distanță`, description: "Ești aproape, verifică distanța!" });
    }
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Harta Mistică a Transilvaniei (Globle)
        </Badge>
        <p className="text-xs text-purple-300/80">
          Identifică orașul secret din Transilvania folosind indiciile de distanță.
        </p>
      </div>

      {/* Mystery Clue Box */}
      <div className="w-full bg-purple-950/60 p-4 rounded-xl border border-amber-400/40 text-left mb-4 shadow">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
          <Compass className="w-4 h-4 text-amber-400" />
          Indiciu Geografic:
        </div>
        <p className="text-xs text-purple-200">{TARGET_LOCATION.clue}</p>
      </div>

      {/* Guesses Log */}
      {guesses.length > 0 && (
        <div className="w-full space-y-2 mb-4">
          {guesses.map((g, idx) => {
            const isMatch = g.distanceKm === 0;
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-center justify-between text-xs font-bold ${
                  isMatch
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : g.distanceKm < 80
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-purple-950/40 border-purple-800 text-purple-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{g.loc.name} ({g.loc.county})</span>
                </div>
                <div>
                  {isMatch ? "🎯 ȚINTĂ ATINSĂ!" : `🔥 ${g.distanceKm} km`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Location Selectors */}
      {!isWon && (
        <div className="grid grid-cols-2 gap-2 w-full mb-4">
          {OPTIONS.map((loc) => {
            const alreadyGuessed = guesses.some((g) => g.loc.name === loc.name);
            return (
              <button
                key={loc.name}
                type="button"
                disabled={alreadyGuessed}
                onClick={() => handleGuess(loc)}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                  alreadyGuessed
                    ? "opacity-40 bg-purple-950 border-purple-900 text-gray-400 cursor-not-allowed"
                    : "bg-purple-900/40 hover:bg-amber-400 hover:text-purple-950 border-purple-700/60 text-purple-200"
                }`}
              >
                <div className="font-heading text-sm">{loc.name}</div>
                <div className="text-[10px] opacity-80">Jud. {loc.county}</div>
              </button>
            );
          })}
        </div>
      )}

      {isWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Misterul Geografic a fost Descifrat ({TARGET_LOCATION.name})!
        </div>
      )}
    </div>
  );
}
