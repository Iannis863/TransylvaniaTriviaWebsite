import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrosswordGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

// 5x5 Asymmetric Midi Layout
const SOLUTION = [
  ["C", "A", "P", "#", "#"],
  ["O", "R", "A", "S", "E"],
  ["R", "A", "S", "A", "T"],
  ["#", "T", "A", "R", "I"],
  ["#", "#", "T", "E", "L"],
];

interface Clue {
  num: number;
  dir: "across" | "down";
  row: number;
  col: number;
  text: string;
  len: number;
}

const CLUES: Clue[] = [
  { num: 1, dir: "across", row: 0, col: 0, text: "Partea pe care stă pălăria", len: 3 },
  { num: 4, dir: "across", row: 1, col: 0, text: "București, Cluj, Timișoara", len: 5 },
  { num: 7, dir: "across", row: 2, col: 0, text: "De viță nobilă, cu pedigree", len: 5 },
  { num: 8, dir: "across", row: 3, col: 1, text: "Puternici, rezistenți", len: 4 },
  { num: 9, dir: "across", row: 4, col: 2, text: "Obiectiv, scop", len: 3 },
  
  { num: 1, dir: "down", row: 0, col: 0, text: "Ansamblu de cântăreți", len: 3 },
  { num: 2, dir: "down", row: 0, col: 1, text: "Pământ lucrat cu plugul", len: 4 },
  { num: 3, dir: "down", row: 0, col: 2, text: "Terci de mălai (sau pasă la fotbal)", len: 5 },
  { num: 5, dir: "down", row: 1, col: 3, text: "Condiment esențial (sau verb)", len: 4 },
  { num: 6, dir: "down", row: 1, col: 4, text: "Alcool ...", len: 4 },
];

export default function CrosswordGame({ onSolve, isAlreadySolved = false }: CrosswordGameProps) {
  const { toast } = useToast();
  const [grid, setGrid] = useState<string[][]>(
    isAlreadySolved 
      ? SOLUTION.map(r => [...r]) 
      : SOLUTION.map(r => r.map(c => c === "#" ? "#" : ""))
  );
  
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [isWon, setIsWon] = useState(isAlreadySolved);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAlreadySolved && !selectedCell) {
      setSelectedCell({ r: 0, c: 0 });
    }
  }, [isAlreadySolved]);

  useEffect(() => {
    if (selectedCell) {
      const el = document.getElementById(`cell-${selectedCell.r}-${selectedCell.c}`);
      if (el) el.focus();
    }
  }, [selectedCell]);

  const checkWin = (currentGrid: string[][]) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (currentGrid[r][c] !== SOLUTION[r][c]) {
          return false;
        }
      }
    }
    return true;
  };

  const handleCellClick = (r: number, c: number) => {
    if (isWon || SOLUTION[r][c] === "#") return;
    
    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection(d => d === "across" ? "down" : "across");
    } else {
      setSelectedCell({ r, c });
    }
  };

  const getNextCellInWord = (r: number, c: number, dir: "across" | "down", step: number) => {
    let nr = r;
    let nc = c;
    if (dir === "across") {
      nc += step;
      if (nc >= 5 || nc < 0 || SOLUTION[nr][nc] === "#") return null;
    } else {
      nr += step;
      if (nr >= 5 || nr < 0 || SOLUTION[nr][nc] === "#") return null;
    }
    return { r: nr, c: nc };
  };

  const advanceCursor = (r: number, c: number, dir: "across" | "down", step: number = 1) => {
    const next = getNextCellInWord(r, c, dir, step);
    if (next) setSelectedCell(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (isWon) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const newGrid = [...grid.map(row => [...row])];
      if (newGrid[r][c] !== "") {
        newGrid[r][c] = "";
        setGrid(newGrid);
      } else {
        const prev = getNextCellInWord(r, c, direction, -1);
        if (prev) {
          newGrid[prev.r][prev.c] = "";
          setGrid(newGrid);
          setSelectedCell(prev);
        }
      }
      return;
    }

    if (e.key === "ArrowRight") { e.preventDefault(); setDirection("across"); advanceCursor(r, c, "across", 1); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); setDirection("across"); advanceCursor(r, c, "across", -1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setDirection("down"); advanceCursor(r, c, "down", 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setDirection("down"); advanceCursor(r, c, "down", -1); return; }

    if (/^[a-zA-ZăâîșțĂÂÎȘȚ]$/.test(e.key)) {
      e.preventDefault();
      
      let char = e.key.toUpperCase();
      const diacriticsMap: Record<string, string> = { "Ă": "A", "Â": "A", "Î": "I", "Ș": "S", "Ț": "T" };
      char = diacriticsMap[char] || char;

      const newGrid = grid.map(row => [...row]);
      newGrid[r][c] = char;
      setGrid(newGrid);

      if (checkWin(newGrid)) {
        setIsWon(true);
        toast({ title: "🎉 Rebus Completat!", description: "Ai dezlegat cuvintele încrucișate!" });
        onSolve({ completed: true });
      } else {
        advanceCursor(r, c, direction, 1);
      }
    }
  };

  const getActiveWordCells = () => {
    if (!selectedCell) return [];
    const cells = [];
    const { r, c } = selectedCell;
    
    if (direction === "across") {
      let startC = c;
      while (startC > 0 && SOLUTION[r][startC - 1] !== "#") startC--;
      let endC = c;
      while (endC < 4 && SOLUTION[r][endC + 1] !== "#") endC++;
      for (let i = startC; i <= endC; i++) cells.push(`${r}-${i}`);
    } else {
      let startR = r;
      while (startR > 0 && SOLUTION[startR - 1][c] !== "#") startR--;
      let endR = r;
      while (endR < 4 && SOLUTION[endR + 1][c] !== "#") endR++;
      for (let i = startR; i <= endR; i++) cells.push(`${i}-${c}`);
    }
    return cells;
  };

  const activeCells = getActiveWordCells();
  
  const currentClue = CLUES.find(c => {
    if (c.dir !== direction) return false;
    if (direction === "across") {
      return c.row === selectedCell?.r && selectedCell?.c >= c.col && selectedCell?.c < c.col + c.len;
    } else {
      return c.col === selectedCell?.c && selectedCell?.r >= c.row && selectedCell?.r < c.row + c.len;
    }
  });

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          NYT Midi-Rebus (5x5)
        </Badge>
        <p className="text-xs text-purple-300/80">Selectează o căsuță și completează careul.</p>
      </div>

      <div 
        ref={gridRef}
        className="bg-purple-950/80 p-2 sm:p-3 rounded-xl border-2 border-amber-400/40 shadow-xl mb-6 w-full aspect-square max-w-[280px] select-none"
      >
        <div className="grid grid-rows-5 h-full gap-0.5 sm:gap-1 bg-purple-900 border border-purple-800">
          {grid.map((row, r) => (
            <div key={r} className="grid grid-cols-5 h-full gap-0.5 sm:gap-1">
              {row.map((char, c) => {
                const isBlocked = SOLUTION[r][c] === "#";
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isInActiveWord = activeCells.includes(`${r}-${c}`);
                const clueStart = CLUES.find(clue => clue.row === r && clue.col === c);

                if (isBlocked) {
                  return <div key={c} className="bg-purple-950/90 w-full h-full rounded-sm" />;
                }

                let bgClass = "bg-[#1f0b3b]";
                if (isSelected) bgClass = "bg-amber-400";
                else if (isInActiveWord) bgClass = "bg-purple-600/60";

                let textClass = "text-white";
                if (isSelected) textClass = "text-purple-950 font-bold";
                else if (isInActiveWord) textClass = "text-amber-200 font-bold";
                else if (isWon) textClass = "text-amber-400 font-bold";

                return (
                  <div
                    key={c}
                    className={`relative w-full h-full flex items-center justify-center cursor-pointer transition-colors rounded-sm ${bgClass}`}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {clueStart && (
                      <span className="absolute top-0.5 left-1 text-[8px] sm:text-[10px] font-bold text-white/50 leading-none">
                        {clueStart.num}
                      </span>
                    )}
                    <input
                      id={`cell-${r}-${c}`}
                      type="text"
                      readOnly
                      value={char}
                      onKeyDown={(e) => handleKeyDown(e, r, c)}
                      className={`w-full h-full bg-transparent outline-none text-center font-heading text-xl sm:text-2xl uppercase cursor-pointer caret-transparent ${textClass}`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {isWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold mb-4 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Rebus Rezolvat pentru Echipă!
        </div>
      )}

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-950/40 p-4 rounded-xl border border-purple-800/40 text-xs text-left shadow-inner">
        <div>
          <div className="font-heading text-sm text-amber-300 uppercase tracking-wider mb-2 border-b border-purple-800/50 pb-1">Orizontal</div>
          <div className="space-y-1.5 h-32 overflow-y-auto pr-1 custom-scrollbar">
            {CLUES.filter(c => c.dir === "across").map((clue) => (
              <div 
                key={`${clue.dir}-${clue.num}`} 
                onClick={() => { setDirection("across"); setSelectedCell({ r: clue.row, c: clue.col }); }}
                className={`flex items-start gap-1.5 p-1 rounded cursor-pointer transition-colors ${currentClue === clue ? "bg-purple-800/60" : "hover:bg-purple-900/40"}`}
              >
                <span className="font-bold text-amber-400/80">{clue.num}.</span>
                <span className={currentClue === clue ? "text-amber-100 font-medium" : "text-purple-200"}>{clue.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="font-heading text-sm text-amber-300 uppercase tracking-wider mb-2 border-b border-purple-800/50 pb-1">Vertical</div>
          <div className="space-y-1.5 h-32 overflow-y-auto pr-1 custom-scrollbar">
            {CLUES.filter(c => c.dir === "down").map((clue) => (
              <div 
                key={`${clue.dir}-${clue.num}`}
                onClick={() => { setDirection("down"); setSelectedCell({ r: clue.row, c: clue.col }); }}
                className={`flex items-start gap-1.5 p-1 rounded cursor-pointer transition-colors ${currentClue === clue ? "bg-purple-800/60" : "hover:bg-purple-900/40"}`}
              >
                <span className="font-bold text-amber-400/80">{clue.num}.</span>
                <span className={currentClue === clue ? "text-amber-100 font-medium" : "text-purple-200"}>{clue.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {currentClue && !isWon && (
        <div className="w-full mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center text-sm font-medium text-amber-200 text-center shadow-lg">
          <span className="font-bold mr-2 text-amber-400">{currentClue.num} {currentClue.dir === "across" ? "Orizontal" : "Vertical"}:</span>
          {currentClue.text}
        </div>
      )}
    </div>
  );
}
