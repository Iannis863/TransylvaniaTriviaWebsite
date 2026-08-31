import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentWeeklyGameData } from "../../lib/weeklyGames";

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

const colors = [
  "bg-amber-500/20 border-amber-400 text-amber-300",
  "bg-emerald-500/20 border-emerald-400 text-emerald-300",
  "bg-blue-500/20 border-blue-400 text-blue-300",
  "bg-purple-500/20 border-purple-400 text-purple-300",
];

const weeklyData = getCurrentWeeklyGameData();
const CATEGORIES: Category[] = weeklyData.connectionsGroups.map((group, idx) => ({
  id: `cat-${idx}`,
  name: group.category,
  color: colors[idx % colors.length],
  items: group.items,
}));

// Smart shuffle: avoid having 4 matching words in the same row
const getSmartShuffled = (words: string[]) => {
  if (words.length <= 4) return [...words].sort(() => Math.random() - 0.5);

  let shuffled = [...words];
  for (let attempt = 0; attempt < 100; attempt++) {
    shuffled.sort(() => Math.random() - 0.5);
    let hasAccidentalSolve = false;
    
    for (let i = 0; i < shuffled.length; i += 4) {
      const row = shuffled.slice(i, i + 4);
      const isSolved = CATEGORIES.some(cat => row.every(w => cat.items.includes(w)));
      if (isSolved) {
        hasAccidentalSolve = true;
        break;
      }
    }
    if (!hasAccidentalSolve) break;
  }
  return shuffled;
};

export default function ConnectionsGame({ onSolve, isAlreadySolved = false }: ConnectionsGameProps) {
  const { toast } = useToast();
  const [solvedCategories, setSolvedCategories] = useState<Category[]>(
    isAlreadySolved ? CATEGORIES : []
  );
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isWon, setIsWon] = useState(isAlreadySolved);
  const [boardWords, setBoardWords] = useState<string[]>([]);

  // Initialize board on mount
  useEffect(() => {
    if (!isAlreadySolved) {
      const allWords = CATEGORIES.flatMap((c) => c.items);
      setBoardWords(getSmartShuffled(allWords));
    }
  }, [isAlreadySolved]);

  const toggleWord = (word: string) => {
    if (isWon) return;
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleShuffle = () => {
    setBoardWords(getSmartShuffled(boardWords));
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
      
      const newBoard = boardWords.filter(w => !matched.items.includes(w));
      setBoardWords(newBoard);
      
      toast({ title: `Grup Găsit: ${matched.name}`, description: "Excelentă conexiune!" });

      if (nextSolved.length === CATEGORIES.length) {
        setIsWon(true);
        toast({ title: "🎉 Toate conexiunile au fost găsite!", description: "Ai completat jocul Connections pentru echipă!" });
        onSolve({ completed: true });
      }
    } else {
      setSelectedWords([]);
      toast({ title: "Grup incorect", description: "Aceste cuvinte nu formează o categorie. Încearcă din nou!", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Conexiuni Trivia (4 Categorii x 4 Cuvinte)
        </Badge>
        <p className="text-xs text-purple-300/80">Selectează 4 cuvinte care aparțin aceleiași categorii. (Încercări nelimitate)</p>
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
          {boardWords.map((word) => {
            const isSelected = selectedWords.includes(word);
            return (
              <button
                key={word}
                type="button"
                onClick={() => toggleWord(word)}
                className={`h-16 rounded-xl border font-heading text-xs sm:text-xs md:text-sm font-bold transition-all flex items-center justify-center p-1 text-center leading-tight shadow ${
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

      {/* Actions */}
      {!isWon && (
        <div className="w-full flex items-center justify-between gap-4 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            className="text-xs text-purple-300 hover:text-amber-300 hover:bg-purple-900/40"
          >
            <Shuffle className="w-4 h-4 mr-1.5" />
            Amestecă
          </Button>

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
