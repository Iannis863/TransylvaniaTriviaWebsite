import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import VALID_WORDS from "./valid-words.json";
import { getCurrentWeeklyGameData } from "../../lib/weeklyGames";

interface WordleGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

const WORD_LENGTH = 5;

// Today's target word based on the weekly engine
const weeklyData = getCurrentWeeklyGameData();
const TARGET_WORD = weeklyData.wordleWord;

export default function WordleGame({ onSolve, isAlreadySolved = false }: WordleGameProps) {
  const { toast } = useToast();
  const [guesses, setGuesses] = useState<string[]>(isAlreadySolved ? [TARGET_WORD] : []);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameWon, setGameWon] = useState(isAlreadySolved);
  const [invalidShake, setInvalidShake] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ];

  const handleCharInput = (char: string) => {
    if (gameWon) return;
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
      triggerInvalidShake("Cuvânt incomplet", `Cuvântul trebuie să aibă exact ${WORD_LENGTH} litere.`);
      return;
    }

    if (!VALID_WORDS.includes(currentGuess)) {
      triggerInvalidShake("Cuvânt invalid", "Acest cuvânt nu există în dicționarul nostru.");
      return;
    }

    if (guesses.includes(currentGuess)) {
      triggerInvalidShake("Deja încercat", "Ai introdus deja acest cuvânt.");
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);

    if (currentGuess === TARGET_WORD) {
      setTimeout(() => {
        setGameWon(true);
        toast({ title: "🎉 Felicitări!", description: "Ai ghicit cuvântul din dicționar!" });
        onSolve({ solution: TARGET_WORD, attempts: newGuesses.length });
      }, WORD_LENGTH * 300 + 500);
    }

    setCurrentGuess("");
  };

  const triggerInvalidShake = (title: string, description: string) => {
    setInvalidShake(true);
    setTimeout(() => setInvalidShake(false), 500);
    toast({ title, description, variant: "destructive" });
  };

  // Scroll to bottom when new guesses are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [guesses, currentGuess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent intercepting if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      
      if (e.key === "Enter") handleCharInput("ENTER");
      else if (e.key === "Backspace") handleCharInput("⌫");
      else if (/^[a-zA-Z]$/.test(e.key)) handleCharInput(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, gameWon, guesses]);

  const getLetterStatus = (letter: string, index: number, guessWord: string) => {
    if (!letter) return "empty";
    if (TARGET_WORD[index] === letter) return "correct";
    
    const letterCountInTarget = TARGET_WORD.split("").filter((l) => l === letter).length;
    let priorOccurrencesInGuess = 0;
    for (let i = 0; i <= index; i++) {
      if (guessWord[i] === letter) priorOccurrencesInGuess++;
    }
    const correctOccurrences = guessWord.split("").filter((l, i) => l === letter && TARGET_WORD[i] === letter).length;
    
    if (TARGET_WORD.includes(letter) && priorOccurrencesInGuess <= letterCountInTarget - correctOccurrences) {
      return "present";
    }
    return "absent";
  };

  const getKeyStatus = (key: string) => {
    let status = "unused";
    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          const s = getLetterStatus(key, i, guess);
          if (s === "correct") return "correct";
          if (s === "present" && status !== "correct") status = "present";
          if (s === "absent" && status === "unused") status = "absent";
        }
      }
    }
    return status;
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case "correct": return "bg-emerald-500 border-emerald-500 text-white";
      case "present": return "bg-amber-500 border-amber-500 text-white";
      case "absent": return "bg-zinc-800 border-zinc-800 text-white";
      case "filled": return "border-purple-500 text-white bg-transparent";
      default: return "border-purple-800/40 bg-purple-950/30 text-white";
    }
  };

  // Determine how many rows to show (always at least 6, or more if guesses exceed 5)
  const totalRows = Math.max(6, guesses.length + (gameWon ? 0 : 1));

  return (
    <div className="flex flex-col items-center max-w-md mx-auto w-full">
      <div className="text-center mb-6">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Cuvântul Săptămânii • {WORD_LENGTH} Litere
        </Badge>
        <p className="text-xs text-purple-300/80">Număr nelimitat de încercări. Trebuie să fie un cuvânt valid.</p>
      </div>

      {/* Grid Container with Scrolling */}
      <div 
        ref={scrollRef}
        className="mb-8 w-full flex flex-col items-center overflow-y-auto custom-scrollbar pr-2"
        style={{ 
          height: '384px', // Exactly fits 6 rows of 56px height + 8px gap
          scrollBehavior: 'smooth' 
        }}
      >
        <div className="flex flex-col gap-2 pb-1">
          {Array.from({ length: totalRows }).map((_, rowIndex) => {
            const isCurrentRow = rowIndex === guesses.length;
            const guess = guesses[rowIndex] || (isCurrentRow ? currentGuess : "");
            const isSubmitted = rowIndex < guesses.length;

            return (
              <motion.div 
                key={rowIndex} 
                className="grid grid-cols-5 gap-2"
                animate={isCurrentRow && invalidShake ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                  const letter = guess[colIndex] || "";
                  const status = isSubmitted ? getLetterStatus(letter, colIndex, guess) : (letter ? "filled" : "empty");
                  const colors = getStatusColors(status);
                  
                  return (
                    <motion.div
                      key={colIndex}
                      initial={false}
                      animate={
                        isSubmitted
                          ? { rotateX: [0, 90, 0] }
                          : letter
                          ? { scale: [1, 1.1, 1] }
                          : {}
                      }
                      transition={
                        isSubmitted 
                          ? { duration: 0.6, delay: colIndex * 0.3 }
                          : { duration: 0.1 }
                      }
                      className={`w-14 h-14 rounded border-2 flex items-center justify-center font-heading text-3xl font-bold shadow ${colors}`}
                      style={isSubmitted ? { transformOrigin: "center center" } : {}}
                    >
                      {letter}
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Game State Banner */}
      {gameWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold mb-4 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Rezolvat pentru Echipă din {guesses.length} încercări!
        </div>
      )}

      {/* Virtual Keyboard */}
      <div className="w-full space-y-2 select-none px-1">
        {keyboardRows.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1.5">
            {row.map((key) => {
              const isSpecial = key === "ENTER" || key === "⌫";
              const keyStatus = getKeyStatus(key);
              let keyBg = "bg-purple-900/60 text-purple-200 border-purple-700/50";
              if (keyStatus === "correct") keyBg = "bg-emerald-500 border-emerald-500 text-white";
              if (keyStatus === "present") keyBg = "bg-amber-500 border-amber-500 text-white";
              if (keyStatus === "absent") keyBg = "bg-zinc-800 border-zinc-800 text-zinc-400";
              
              return (
                <button
                  key={key}
                  onClick={() => handleCharInput(key)}
                  className={`h-14 rounded font-bold text-sm flex items-center justify-center border transition-all ${
                    isSpecial ? "px-3 bg-purple-800/60 border-purple-600/40 text-purple-100" : `w-10 ${keyBg}`
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
