import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConnectionsGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  items: string[];
}

const CATEGORIES: Category[] = [
  {
    id: "castles",
    name: "Castele Faimoase din Transilvania",
    color: "bg-amber-500/20 border-amber-400 text-amber-300",
    items: ["BRAN", "CORVINILOR", "BANFFY", "BETHLEN"],
  },
  {
    id: "creatures",
    name: "Creaturi din Folclorul Mistic",
    color: "bg-purple-600/20 border-purple-400 text-purple-200",
    items: ["STRIGOI", "VÂRCOLAC", "MOROI", "PRICOLICI"],
  },
  {
    id: "prizes",
    name: "Recompense & Premii la Trivia",
    color: "bg-emerald-500/20 border-emerald-400 text-emerald-300",
    items: ["VIN", "BERE", "SHOTURI", "GLORIE"],
  },
  {
    id: "rock",
    name: "Formații Legendare de Rock Românesc",
    color: "bg-blue-500/20 border-blue-400 text-blue-300",
    items: ["PHOENIX", "CARGO", "BUCOVINA", "TROOPER"],
  },
];

export default function ConnectionsGame({ onSolve, isAlreadySolved = false }: ConnectionsGameProps) {
  const { toast } = useToast();
  const [solvedCategories, setSolvedCategories] = useState<Category[]>(
    isAlreadySolved ? CATEGORIES : []
  );
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(4);
  const [isWon, setIsWon] = useState(isAlreadySolved);

  // All remaining words
  const solvedWords = new Set(solvedCategories.flatMap((c) => c.items));
  const remainingWords = CATEGORIES.flatMap((c) => c.items).filter((w) => !solvedWords.has(w));

  const toggleWord = (word: string) => {
    if (isWon) return;
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const submitGroup = () => {
    if (selectedWords.length !== 4) return;

    // Check match against categories
    const matched = CATEGORIES.find((cat) => {
      const setA = new Set(cat.items);
      return selectedWords.every((w) => setA.has(w));
    });

    if (matched) {
      const nextSolved = [...solvedCategories, matched];
      setSolvedCategories(nextSolved);
      setSelectedWords([]);
      toast({ title: `Grup Găsit: ${matched.name}`, description: "Excelentă conexiune!" });

      if (nextSolved.length === CATEGORIES.length) {
        setIsWon(true);
        toast({ title: "🎉 Toate conexiunile au fost găsite!", description: "Ai completat jocul Connections pentru echipă!" });
        onSolve({ completed: true });
      }
    } else {
      const nextAttempts = attemptsLeft - 1;
      setAttemptsLeft(nextAttempts);
      setSelectedWords([]);
      if (nextAttempts <= 0) {
        toast({ title: "Ai rămas fără încercări!", description: "Mai încearcă odată pentru a ajuta echipa.", variant: "destructive" });
      } else {
        toast({ title: "Grup incorect", description: `Mai ai ${nextAttempts} încercări.`, variant: "destructive" });
      }
    }
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Conexiuni Trivia (4 Categorii x 4 Cuvinte)
        </Badge>
        <p className="text-xs text-purple-300/80">Selectează 4 cuvinte care aparțin aceleiași categorii tematice.</p>
      </div>

      {/* Solved Categories Banners */}
      <div className="w-full space-y-2 mb-3">
        {solvedCategories.map((cat) => (
          <div
            key={cat.id}
            className={`p-3 rounded-xl border text-center font-bold text-xs sm:text-sm shadow ${cat.color}`}
          >
            <div className="uppercase tracking-wider font-heading text-base">{cat.name}</div>
            <div className="text-xs font-normal opacity-90 mt-0.5">{cat.items.join(" • ")}</div>
          </div>
        ))}
      </div>

      {/* Remaining Words Grid */}
      {!isWon && (
        <div className="grid grid-cols-4 gap-2 w-full mb-5">
          {remainingWords.map((word) => {
            const isSelected = selectedWords.includes(word);
            return (
              <button
                key={word}
                type="button"
                onClick={() => toggleWord(word)}
                className={`h-16 rounded-xl border font-heading text-xs sm:text-sm font-bold transition-all flex items-center justify-center p-1 text-center leading-tight shadow ${
                  isSelected
                    ? "bg-amber-400 text-purple-950 border-amber-300 scale-102 shadow-md"
                    : "bg-purple-950/60 border-purple-700/50 text-purple-200 hover:bg-purple-900/40 hover:border-amber-400/50"
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      )}

      {/* Attempts & Actions */}
      {!isWon && (
        <div className="w-full flex items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
            <span>Încercări:</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < attemptsLeft ? "bg-amber-400 shadow-[0_0_8px_rgba(246,184,40,0.6)]" : "bg-purple-950 border border-purple-800"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWords([])}
              disabled={selectedWords.length === 0}
              className="text-xs border-purple-700 text-purple-300"
            >
              Deselectează
            </Button>
            <Button
              size="sm"
              onClick={submitGroup}
              disabled={selectedWords.length !== 4}
              className="gold-btn text-xs font-heading"
            >
              TRIMITE ({selectedWords.length}/4)
            </Button>
          </div>
        </div>
      )}

      {isWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold flex items-center justify-center gap-2 mt-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Toate Conexiunile Rezolvate pentru Echipă!
        </div>
      )}
    </div>
  );
}
