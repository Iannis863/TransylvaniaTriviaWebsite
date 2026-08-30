import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RotateCcw, Sparkles, Delete, CornerDownLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WordleGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

const TARGET_WORD = "CASTEL";
const WORD_LENGTH = 6;
const MAX_ATTEMPTS = 6;

export default function WordleGame({ onSolve, isAlreadySolved = false }: WordleGameProps) {
  const { toast } = useToast();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameWon, setGameWon] = useState(isAlreadySolved);
  const [gameOver, setGameOver] = useState(isAlreadySolved);

  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ];

  const handleCharInput = (char: string) => {
    if (gameOver || gameWon) return;
    if (char === "ENTER") {
      submitGuess();
    } else if (char === "⌫" || char === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (currentGuess.length < WORD_LENGTH && /^[A-Za-z]$/.test(char)) {
      setCurrentGuess((prev) => (prev + char).toUpperCase());
    }
  };

  const submitGuess = () => {
    if (currentGuess.length !== WORD_LENGTH) {
      toast({ title: "Cuvânt incomplet", description: `Cuvântul trebuie să aibă exact ${WORD_LENGTH} litere.`, variant: "destructive" });
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);

    if (currentGuess === TARGET_WORD) {
      setGameWon(true);
      setGameOver(true);
      toast({ title: "🎉 Felicitări!", description: "Ai ghicit cuvântul săptămânii pentru echipa ta!" });
      onSolve({ solution: TARGET_WORD, attempts: newGuesses.length });
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameOver(true);
      toast({ title: "Încercări epuizate!", description: `Cuvântul secret era: ${TARGET_WORD}`, variant: "destructive" });
    }

    setCurrentGuess("");
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleCharInput("ENTER");
      else if (e.key === "Backspace") handleCharInput("⌫");
      else if (/^[a-zA-Z]$/.test(e.key)) handleCharInput(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, gameOver, gameWon, guesses]);

  const getLetterStatus = (letter: string, index: number, guessWord: string) => {
    if (TARGET_WORD[index] === letter) return "bg-emerald-600 border-emerald-400 text-white";
    if (TARGET_WORD.includes(letter)) return "bg-amber-600 border-amber-400 text-white";
    return "bg-purple-950/70 border-purple-800 text-purple-300";
  };

  const getKeyStatus = (key: string) => {
    let status = "bg-purple-950/60 border-purple-700/50 text-purple-200";
    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          if (TARGET_WORD[i] === key) return "bg-emerald-600 border-emerald-400 text-white";
          if (TARGET_WORD.includes(key)) status = "bg-amber-600 border-amber-400 text-white";
          else if (status.includes("bg-purple")) status = "bg-gray-800 border-gray-700 text-gray-400";
        }
      }
    }
    return status;
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Cuvântul Săptămânii • 6 Litere
        </Badge>
        <p className="text-xs text-purple-300/80">Indiciu: Monument istoric transilvănean de apărare.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-rows-6 gap-2 mb-6">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.length;
          const guess = guesses[rowIndex] || (isCurrentRow ? currentGuess : "");

          return (
            <div key={rowIndex} className="grid grid-cols-6 gap-2">
              {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                const letter = guess[colIndex] || "";
                const isGuessedRow = rowIndex < guesses.length;
                const statusClass = isGuessedRow 
                  ? getLetterStatus(letter, colIndex, guess)
                  : letter 
                    ? "border-amber-400 text-amber-300 bg-purple-900/40" 
                    : "border-purple-800/40 bg-purple-950/30 text-white";

                return (
                  <div
                    key={colIndex}
                    className={`w-11 h-12 sm:w-12 sm:h-13 rounded-lg border-2 flex items-center justify-center font-heading text-2xl font-bold shadow transition-all ${statusClass}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Game State Banner */}
      {gameWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold mb-4 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Rezolvat pentru Echipă! Soluție: <strong>{TARGET_WORD}</strong>
        </div>
      )}

      {/* Virtual Keyboard */}
      <div className="w-full space-y-1.5 select-none">
        {keyboardRows.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1">
            {row.map((key) => {
              const isSpecial = key === "ENTER" || key === "⌫";
              return (
                <button
                  key={key}
                  onClick={() => handleCharInput(key)}
                  className={`h-11 rounded font-bold text-xs sm:text-sm flex items-center justify-center border transition-all ${
                    isSpecial ? "px-2.5 sm:px-3 bg-amber-500/20 border-amber-400/40 text-amber-300" : `w-8 sm:w-9 ${getKeyStatus(key)}`
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
