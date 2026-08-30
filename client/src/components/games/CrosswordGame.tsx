import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RotateCcw, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrosswordGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

// Mini 5x5 Trivia Crossword
// Clues:
// 1-Across: BRAM (Author of Dracula)
// 2-Across: VIN (Prize 1)
// 1-Down: BERE (Prize 2)
// 3-Down: LORE (Secret trivia lore)
interface Clue {
  number: number;
  direction: "orizontal" | "vertical";
  clue: string;
  answer: string;
  startR: number;
  startC: number;
}

const CLUES: Clue[] = [
  { number: 1, direction: "orizontal", clue: "Prenumele autorului irlandez al romanului 'Dracula' (4 litere)", answer: "BRAM", startR: 0, startC: 0 },
  { number: 2, direction: "orizontal", clue: "Marele premiu pentru locul 1 la trivia (3 litere)", answer: "VIN", startR: 2, startC: 2 },
  { number: 3, direction: "vertical", clue: "Răsplata rece pentru locul 2 (4 litere)", answer: "BERE", startR: 0, startC: 0 },
  { number: 4, direction: "vertical", clue: "Misterele și legendele oculte transilvănene (4 litere)", answer: "LORE", startR: 1, startC: 4 },
];

export default function CrosswordGame({ onSolve, isAlreadySolved = false }: CrosswordGameProps) {
  const { toast } = useToast();
  const [grid, setGrid] = useState<string[][]>(
    isAlreadySolved
      ? [
          ["B", "R", "A", "M", "#"],
          ["E", "#", "#", "#", "L"],
          ["R", "#", "V", "I", "N"],
          ["E", "#", "#", "#", "R"],
          ["#", "#", "#", "#", "E"],
        ]
      : [
          ["", "", "", "", "#"],
          ["", "#", "#", "#", ""],
          ["", "#", "", "", ""],
          ["", "#", "#", "#", ""],
          ["#", "#", "#", "#", ""],
        ]
  );
  const [selectedClue, setSelectedClue] = useState<number>(1);
  const [isWon, setIsWon] = useState(isAlreadySolved);

  const handleCellChange = (r: number, c: number, val: string) => {
    if (isWon || grid[r][c] === "#") return;
    const char = val.slice(-1).toUpperCase();
    const newGrid = grid.map((row) => [...row]);
    newGrid[r][c] = char;
    setGrid(newGrid);

    // Validate
    const b1 = newGrid[0][0] === "B" && newGrid[0][1] === "R" && newGrid[0][2] === "A" && newGrid[0][3] === "M";
    const b2 = newGrid[2][2] === "V" && newGrid[2][3] === "I" && newGrid[2][4] === "N";
    const b3 = newGrid[0][0] === "B" && newGrid[1][0] === "E" && newGrid[2][0] === "R" && newGrid[3][0] === "E";
    const b4 = newGrid[1][4] === "L" && newGrid[2][4] === "O" || newGrid[1][4] === "L" && newGrid[2][4] === "N"; // intersection

    if (b1 && b2 && b3) {
      setIsWon(true);
      toast({ title: "🎉 Rebus Completat!", description: "Cuvintele încrucișate au fost descifrate cu succes!" });
      onSolve({ completed: true });
    }
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Mini-Rebus Trivia
        </Badge>
        <p className="text-xs text-purple-300/80">Completează căsuțele libere conform indiciilor de mai jos.</p>
      </div>

      {/* Grid */}
      <div className="bg-purple-950/60 p-3 rounded-2xl border-2 border-amber-400/40 shadow mb-6">
        <div className="grid grid-rows-5 gap-1.5">
          {grid.map((row, r) => (
            <div key={r} className="grid grid-cols-5 gap-1.5">
              {row.map((char, c) => {
                const isBlocked = char === "#";
                if (isBlocked) {
                  return <div key={c} className="w-10 h-10 rounded-md bg-purple-950/90 border border-purple-900" />;
                }
                return (
                  <input
                    key={c}
                    type="text"
                    maxLength={1}
                    value={char}
                    disabled={isWon}
                    onChange={(e) => handleCellChange(r, c, e.target.value)}
                    className="w-10 h-10 rounded-md bg-purple-900/40 border border-amber-400/40 text-center font-heading text-xl font-bold text-amber-300 focus:bg-amber-400 focus:text-purple-950 outline-none uppercase transition-all"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Win Banner */}
      {isWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold mb-4 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Rebus Rezolvat pentru Echipă!
        </div>
      )}

      {/* Clues List */}
      <div className="w-full space-y-2 text-left bg-purple-950/40 p-4 rounded-xl border border-purple-800/40 text-xs">
        <div className="font-heading text-sm text-amber-300 uppercase tracking-wider mb-1">Indicii:</div>
        {CLUES.map((clue) => (
          <div key={clue.number} className="flex items-start gap-2 text-purple-200">
            <span className="font-bold text-amber-400">{clue.number}. [{clue.direction.toUpperCase()}]:</span>
            <span>{clue.clue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
