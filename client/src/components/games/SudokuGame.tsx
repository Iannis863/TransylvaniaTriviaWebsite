import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SudokuGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

import { getCurrentWeeklyGameData } from "../../lib/weeklyGames";

const weeklyData = getCurrentWeeklyGameData();
const SOLUTION_BOARD = weeklyData.sudokuBoard;

// Apply a fixed mask to create the initial puzzle (0 means empty)
const MASK = [
  [1, 1, 0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [0, 1, 0, 0, 0, 0, 1, 1, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 1],
  [0, 0, 0, 0, 1, 0, 0, 1, 1],
];

const INITIAL_BOARD = SOLUTION_BOARD.map((row, r) => 
  row.map((val, c) => MASK[r][c] ? val : 0)
);

export default function SudokuGame({ onSolve, isAlreadySolved = false }: SudokuGameProps) {
  const { toast } = useToast();
  const [board, setBoard] = useState<number[][]>(
    isAlreadySolved ? SOLUTION_BOARD.map((row) => [...row]) : INITIAL_BOARD.map((row) => [...row])
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [isWon, setIsWon] = useState(isAlreadySolved);

  const isPreset = (r: number, c: number) => INITIAL_BOARD[r][c] !== 0;

  const handleCellClick = (r: number, c: number) => {
    if (isWon) return;
    setSelectedCell({ r, c });
  };

  const checkWinCondition = (newBoard: number[][]) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (newBoard[r][c] !== SOLUTION_BOARD[r][c]) return false;
      }
    }
    return true;
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || isWon || isPreset(selectedCell.r, selectedCell.c)) return;
    const { r, c } = selectedCell;
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);

    if (checkWinCondition(newBoard)) {
      setIsWon(true);
      toast({ title: "🎉 Sudoku Completat!", description: "Ai descifrat puzzle-ul pentru echipa ta!" });
      onSolve({ completed: true });
    }
  };

  const handleClear = () => {
    if (!selectedCell || isWon || isPreset(selectedCell.r, selectedCell.c)) return;
    const { r, c } = selectedCell;
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = 0;
    setBoard(newBoard);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || isWon) {
        // Allow arrow keys to select a starting cell if none is selected
        if (!selectedCell && !isWon && e.key.startsWith("Arrow")) {
          e.preventDefault();
          setSelectedCell({ r: 0, c: 0 });
        }
        return;
      }

      if (/^[1-9]$/.test(e.key)) {
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleClear();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: Math.max(0, prev.r - 1), c: prev.c } : null));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: Math.min(8, prev.r + 1), c: prev.c } : null));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: prev.r, c: Math.max(0, prev.c - 1) } : null));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: prev.r, c: Math.min(8, prev.c + 1) } : null));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isWon, board]);

  // Find currently highlighted number (like sudoku.com)
  const highlightedNumber = selectedCell && board[selectedCell.r][selectedCell.c] !== 0 
    ? board[selectedCell.r][selectedCell.c] 
    : null;

  return (
    <div className="flex flex-col items-center max-w-md mx-auto w-full">
      <div className="text-center mb-4">
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/40 text-xs mb-1">
          Sudoku Clasic 9x9
        </Badge>
        <p className="text-xs text-purple-300/80">Plasează cifrele 1-9 fără duplicate pe linii, coloane și blocuri 3x3.</p>
      </div>

      {/* Sudoku Grid */}
      <div className="bg-purple-950/60 p-1.5 sm:p-2 rounded-xl border-2 border-amber-400/40 shadow-[0_0_25px_rgba(246,184,40,0.2)] mb-6 w-full aspect-square max-w-[360px]">
        <div className="grid grid-rows-9 h-full">
          {board.map((row, r) => (
            <div key={r} className="grid grid-cols-9 h-full">
              {row.map((val, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isSameNumber = highlightedNumber && val === highlightedNumber && !isSelected;
                const isRelated = selectedCell && !isSelected && (selectedCell.r === r || selectedCell.c === c || (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) && Math.floor(selectedCell.c / 3) === Math.floor(c / 3)));
                
                const isPresetCell = isPreset(r, c);
                
                // 3x3 Block borders
                const borderBottom = (r === 2 || r === 5) ? "border-b-2 border-b-amber-400/50" : "border-b border-b-purple-800/40";
                const borderRight = (c === 2 || c === 5) ? "border-r-2 border-r-amber-400/50" : "border-r border-r-purple-800/40";
                const borderTop = r === 0 ? "border-t border-t-purple-800/40" : "";
                const borderLeft = c === 0 ? "border-l border-l-purple-800/40" : "";

                let bgClass = "bg-purple-950/30";
                let textClass = isPresetCell ? "text-amber-300 font-bold" : "text-purple-100";

                if (isSelected) {
                  bgClass = "bg-amber-400";
                  textClass = "text-purple-950 font-bold";
                } else if (isSameNumber) {
                  bgClass = "bg-amber-500/40";
                } else if (isRelated) {
                  bgClass = "bg-purple-800/40";
                }

                // Error indication (simple conflict check)
                let isConflict = false;
                if (!isPresetCell && val !== 0 && !isWon) {
                  // check row
                  if (board[r].filter((v, i) => i !== c && v === val).length > 0) isConflict = true;
                  // check col
                  if (board.filter((rv, i) => i !== r && rv[c] === val).length > 0) isConflict = true;
                  // check block
                  const br = Math.floor(r / 3) * 3;
                  const bc = Math.floor(c / 3) * 3;
                  for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                      if ((br + i !== r || bc + j !== c) && board[br + i][bc + j] === val) isConflict = true;
                    }
                  }
                }

                if (isConflict && !isSelected) {
                  bgClass = "bg-red-500/30";
                  textClass = "text-red-300 font-bold";
                }

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    className={`flex items-center justify-center font-heading text-lg sm:text-2xl transition-colors ${borderBottom} ${borderRight} ${borderTop} ${borderLeft} ${bgClass} ${textClass}`}
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
      <div className="w-full max-w-[360px]">
        <div className="grid grid-cols-5 gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isWon}
              onClick={() => handleNumberInput(num)}
              className="aspect-[4/3] rounded-lg bg-purple-900/50 hover:bg-amber-400 hover:text-purple-950 border border-purple-600/40 text-amber-300 font-heading text-2xl font-bold transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isWon}
              onClick={() => handleNumberInput(num)}
              className="aspect-[4/3] rounded-lg bg-purple-900/50 hover:bg-amber-400 hover:text-purple-950 border border-purple-600/40 text-amber-300 font-heading text-2xl font-bold transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={isWon}
            onClick={handleClear}
            className="aspect-[4/3] rounded-lg bg-purple-950 border border-purple-700 text-xs sm:text-sm text-purple-300 hover:text-red-400 font-bold flex items-center justify-center"
          >
            Șterge
          </button>
        </div>
      </div>
    </div>
  );
}
