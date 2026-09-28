import { t } from "@/lib/i18n";
import { useState } from "react";
import { CheckCircle2, Lightbulb, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WeeklyGameData } from "@/lib/weeklyGames";
import {
  applyTargetMove, initialTargetTokens, OPERATOR_LABELS, TARGET_OPERATORS,
  type TargetMove, type TargetOperator,
} from "@shared/target-game";

interface TargetGameProps {
  weeklyData: WeeklyGameData;
  onSolve: (data: { moves: TargetMove[] }) => void;
  isAlreadySolved?: boolean;
}

export default function TargetGame({ weeklyData, onSolve, isAlreadySolved = false }: TargetGameProps) {
  const puzzle = weeklyData.targetPuzzle;
  const [history, setHistory] = useState([initialTargetTokens(puzzle)]);
  const [moves, setMoves] = useState<TargetMove[]>([]);
  const [leftId, setLeftId] = useState<number | null>(null);
  const [rightId, setRightId] = useState<number | null>(null);
  const [operator, setOperator] = useState<TargetOperator | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("");
  const tokens = history[history.length - 1];
  const isWon = isAlreadySolved || (tokens.length === 1 && tokens[0].value === puzzle.target);
  const left = tokens.find(token => token.id === leftId);
  const right = tokens.find(token => token.id === rightId);

  const clearSelection = () => { setLeftId(null); setRightId(null); setOperator(null); setMessage(""); };
  const selectNumber = (id: number) => {
    setMessage("");
    if (id === leftId) { setLeftId(null); setRightId(null); }
    else if (id === rightId) setRightId(null);
    else if (leftId === null) setLeftId(id);
    else setRightId(id);
  };
  const combine = () => {
    if (isWon || leftId === null || rightId === null || operator === null) return;
    const move = { leftId, rightId, operator };
    const next = applyTargetMove(tokens, move);
    if (!next) { setMessage(t("Alege o operație cu rezultat întreg, fără numere negative sau împărțire la zero.")); return; }
    const nextMoves = [...moves, move];
    setHistory([...history, next]);
    setMoves(nextMoves);
    clearSelection();
    if (next.length === 1) {
      if (next[0].value === puzzle.target) onSolve({ moves: nextMoves });
      else setMessage(t("Ai obținut {0}. Ținta este {1}. Revino un pas sau încearcă din nou!", [next[0].value, puzzle.target]));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/40 mb-3">{t("Atinge Ținta · 3 numere, 2 pași")}</Badge>
      <p className="text-sm text-purple-200/80">{t("Combină două numere, apoi folosește rezultatul cu numărul rămas. Folosește fiecare număr o singură dată.")}</p>
      <p className="text-xs text-purple-300/70 mt-2">{t("Doar rezultate întregi, fără numere negative. Ai încercări nelimitate.")}</p>

      <div className="my-6">
        <p className="text-xs uppercase tracking-widest text-purple-300">{t("Ținta săptămânii")}</p>
        <p className="text-6xl font-heading text-amber-300 mt-2">{puzzle.target}</p>
      </div>

      {isWon ? (
        <div role="status" className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />  {t("Țintă atinsă! Joc completat pentru echipă.")} </div>
      ) : (
        <>
          <p className="text-sm text-purple-200 mb-3">{t("Alege două numere și o operație, apoi apasă „Combină”.")}</p>
          <div className="flex justify-center gap-3">
            {tokens.map(token => (
              <button key={token.id} type="button" onClick={() => selectNumber(token.id)}
                aria-pressed={token.id === leftId || token.id === rightId}
                aria-label={`${token.value}${token.id === leftId ? t(", primul număr") : token.id === rightId ? t(", al doilea număr") : ""}`}
                className={`w-20 h-20 rounded-xl border-2 text-3xl font-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${token.id === leftId || token.id === rightId ? "bg-amber-400 text-purple-950 border-amber-200" : "bg-purple-950/60 text-amber-300 border-purple-600/50 hover:border-amber-300"}`}>
                {token.value}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 w-full max-w-64 mx-auto" role="group" aria-label={t("Operația matematică")}>
            {TARGET_OPERATORS.map(op => (
              <Button key={op} type="button" variant="outline" aria-pressed={operator === op}
                aria-label={({ "+": t("Adunare"), "-": t("Scădere"), "*": t("Înmulțire"), "/": t("Împărțire") })[op]}
                onClick={() => { setOperator(op); setMessage(""); }}
                className={`w-full min-w-0 px-0 h-12 text-2xl ${operator === op ? "bg-amber-400 text-purple-950 border-amber-200 hover:bg-amber-300 hover:text-purple-950" : "text-purple-200 border-purple-600/50"}`}>
                {OPERATOR_LABELS[op]}
              </Button>
            ))}
          </div>
          <p aria-live="polite" className="text-xl text-purple-100 my-4 tabular-nums">
            {left?.value ?? "?"} {operator ? OPERATOR_LABELS[operator] : "…"} {right?.value ?? "?"}
          </p>
          <Button type="button" onClick={combine} disabled={!left || !right || !operator} className="gold-btn w-full rounded-xl h-12">{t("Combină")}</Button>
        </>
      )}

      {moves.length > 0 && (
        <ol aria-label={t("Pașii tăi")} className="text-sm text-purple-200/80 space-y-1 mt-4">
          {moves.map((move, index) => {
            const step = history[index + 1].find(token => token.id === (move.leftId | move.rightId))!;
            return <li key={index}>{step.expression} = {step.value}</li>;
          })}
        </ol>
      )}
      <p role="status" className="text-sm text-amber-200 mt-3 min-h-5">{message}</p>
      {!isWon && (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <Button type="button" variant="ghost" disabled={moves.length === 0 && leftId === null && operator === null}
            onClick={() => {
              if (leftId === null && rightId === null && operator === null && moves.length > 0) {
                setHistory(history.slice(0, -1)); setMoves(moves.slice(0, -1));
              }
              clearSelection();
            }}><Undo2 className="w-4 h-4 mr-2" />{t("Înapoi")}</Button>
          <Button type="button" variant="ghost" onClick={() => { setHistory([initialTargetTokens(puzzle)]); setMoves([]); clearSelection(); }}>
            <RotateCcw className="w-4 h-4 mr-2" />{t("Reîncepe")} </Button>
          <Button type="button" variant="ghost" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>
            <Lightbulb className="w-4 h-4 mr-2" />{t("Indiciu")} </Button>
        </div>
      )}
      {showHint && !isWon && <p className="mt-3 p-3 rounded-lg bg-purple-900/40 text-sm text-purple-100">{puzzle.hint}</p>}
    </div>
  );
}
