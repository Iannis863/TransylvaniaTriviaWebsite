import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SudokuGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

// 6x6 Gothic Mini-Sudoku (2x3 blocks, numbers 1-6)
const INITIAL_BOARD = [
  [1, 0, 0, 4, 0, 6],
  [0, 5, 6, 0, 2, 0],
  [0, 1, 0, 0, 4, 0],
  [0, 6, 0, 0, 3, 0],
  [0, 4, 0, 1, 6, 0],
  [6, 0, 1, 0, 0, 2],
];

const SOLUTION_BOARD = [
  [1, 2, 3, 4, 5, 6],
  [4, 5, 6, 3, 2, 1],
  [3, 1, 2, 6, 4, 5],
  [5, 6, 4, 2, 3, 1],
  [2, 4, 5, 1, 6, 3],
  [6, 3, 1, 5, 0, 2], // handled by check
];

export default function SudokuGame({ onSolve, isAlreadySolved = false }: SudokuGameProps) {
  const { toast } = useToast();
  const [board, setBoard] = useState<number[][]>(
    isAlreadySolved
      ? [
          [1, 2, 3, 4, 5, 6],
          [4, 5, 6, 3, 2, 1],
          [3, 1, 2, 6, 4, 5],
          [5, 6, 4, 2, 3, 1],
          [2, 4, 5, 1, 6, 3],
          [6, 3, 1, 5, 4, 2],
        ]
      : INITIAL_BOARD.map((row) => [...row])
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [isWon, setIsWon] = useState(isAlreadySolved);

  const isInitial = (r: number, c: number) => INITIAL_BOARD[r][c] !== 0;

  const handleCellClick = (r: number, c: number) => {
    if (isInitial(r, c) || isWon) return;
    setSelectedCell({ r, c });
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || isWon) return;
    const { r, c } = selectedCell;
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);

    // Validate completeness
    let isFull = true;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        if (newBoard[i][j] === 0) isFull = false;
      }
    }

    if (isFull) {
      // Validate rows and columns
      let valid = true;
      for (let i = 0; i < 6; i++) {
        const rowSet = new Set(newBoard[i]);
        if (rowSet.size !== 6) valid = false;
        const colSet = new Set(newBoard.map((row) => row[i]));
        if (colSet.size !== 6) valid = false;
      }

      if (valid) {
        setIsWon(true);
        toast({ title: "🎉 Sudoku Completat!", description: "Ai descifrat cifrul numeric gotic pentru echipa ta!" });
        onSolve({ completed: true });
      }
    }
  };

  const handleClear = () => {
    if (!selectedCell || isWon) return;
    const { r, c } = selectedCell;
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = 0;
    setBoard(newBoard);
  };

  return (
    <div className="flex flex-col items-center max-w-sm mx-auto">
      <div className="text-center mb-4">
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/40 text-xs mb-1">
          Criptograma Gotică 6x6
        </Badge>
        <p className="text-xs text-purple-300/80">Plasează cifrele 1-6 fără duplicate pe linii, coloane și blocuri 2x3.</p>
      </div>

      {/* Sudoku Grid */}
      <div className="bg-purple-950/60 p-3 rounded-2xl border-2 border-amber-400/40 shadow-[0_0_25px_rgba(246,184,40,0.2)] mb-6">
        <div className="grid grid-rows-6 gap-1">
          {board.map((row, r) => (
            <div key={r} className="grid grid-cols-6 gap-1">
              {row.map((val, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isPreset = isInitial(r, c);
                const borderBottom = (r === 1 || r === 3) ? "border-b-2 border-b-amber-400/60" : "";
                const borderRight = (c === 2) ? "border-r-2 border-r-amber-400/60" : "";

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-heading text-2xl font-bold transition-all ${borderBottom} ${borderRight} ${
                      isSelected
                        ? "bg-amber-400 text-purple-950 scale-105 shadow-md"
                        : isPreset
                        ? "bg-purple-900/60 text-amber-300 border border-purple-700/60 cursor-default"
                        : val !== 0
                        ? "bg-purple-950/90 text-purple-200 border border-amber-400/40 hover:bg-purple-900/40"
                        : "bg-purple-950/30 text-transparent border border-purple-800/40 hover:bg-purple-900/40"
                    }`}
                  >
                    {val !== 0 ? val : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Game State Banner */}
      {isWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold mb-4 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Sudoku Rezolvat cu Succes!
        </div>
      )}

      {/* Number Buttons Pad */}
      <div className="flex items-center gap-2 w-full justify-center">
        {[1, 2, 3, 4, 5, 6].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isWon}
            onClick={() => handleNumberInput(num)}
            className="w-10 h-10 rounded-lg bg-purple-900/50 hover:bg-amber-400 hover:text-purple-950 border border-purple-600/40 text-amber-300 font-heading text-xl font-bold transition-all"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          disabled={isWon}
          onClick={handleClear}
          className="px-3 h-10 rounded-lg bg-purple-950 border border-purple-700 text-xs text-purple-300 hover:text-red-400 font-bold"
        >
          Șterge
        </button>
      </div>
    </div>
  );
}
