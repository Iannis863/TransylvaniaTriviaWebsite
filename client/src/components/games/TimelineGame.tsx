import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowUp, ArrowDown, Sparkles, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TimelineGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

interface TimelineEvent {
  id: string;
  title: string;
  year: number;
  description: string;
}

const INITIAL_EVENTS: TimelineEvent[] = [
  { id: "e1", title: "Prima atestare documentară a cetății Clujului (Castrum Clus)", year: 1213, description: "Apare în documentele cancelariei maghiare." },
  { id: "e2", title: "Vlad Țepeș urcă pe tronul Țării Românești (a doua domnie)", year: 1456, description: "Începutul domniei sale legendare." },
  { id: "e3", title: "Publicarea romanului 'Dracula' de Bram Stoker", year: 1897, description: "Capodopera gotică vede lumina tiparului la Londra." },
  { id: "e4", title: "Marea Unire de la Alba Iulia", year: 1918, description: "Transilvania se unește cu Regatul României." },
  { id: "e5", title: "Deschiderea faimoasei Cafenele & Restaurant Insomnia", year: 1997, description: "Locul de întâlnire al boemilor și artiștilor clujeni." },
  { id: "e6", title: "Lansarea primului sezon Transilvania Trivia", year: 2026, description: "Nașterea celui mai spectaculos concurs de quiz." },
];

export default function TimelineGame({ onSolve, isAlreadySolved = false }: TimelineGameProps) {
  const { toast } = useToast();
  // Start shuffled
  const [events, setEvents] = useState<TimelineEvent[]>(
    isAlreadySolved
      ? [...INITIAL_EVENTS].sort((a, b) => a.year - b.year)
      : [...INITIAL_EVENTS].sort(() => Math.random() - 0.5)
  );
  const [isWon, setIsWon] = useState(isAlreadySolved);
  const [hasChecked, setHasChecked] = useState(isAlreadySolved);

  const moveUp = (index: number) => {
    if (index === 0 || isWon) return;
    const newEvents = [...events];
    const temp = newEvents[index];
    newEvents[index] = newEvents[index - 1];
    newEvents[index - 1] = temp;
    setEvents(newEvents);
    setHasChecked(false);
  };

  const moveDown = (index: number) => {
    if (index === events.length - 1 || isWon) return;
    const newEvents = [...events];
    const temp = newEvents[index];
    newEvents[index] = newEvents[index + 1];
    newEvents[index + 1] = temp;
    setEvents(newEvents);
    setHasChecked(false);
  };

  const checkOrder = () => {
    setHasChecked(true);
    let correct = true;
    for (let i = 0; i < events.length - 1; i++) {
      if (events[i].year > events[i + 1].year) {
        correct = false;
        break;
      }
    }

    if (correct) {
      setIsWon(true);
      toast({ title: "🎉 Cronologie Perfectă!", description: "Ai ordonat toate evenimentele istorice corect!" });
      onSolve({ completed: true });
    } else {
      toast({ title: "Ordinea nu este corectă", description: "Verifică anii și rearanjează evenimentele.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Cronologia Istoriei (Timdle)
        </Badge>
        <p className="text-xs text-purple-300/80">
          Ordonează evenimentele cronologic, de la cel mai vechi (sus) la cel mai recent (jos).
        </p>
      </div>

      {/* Events List */}
      <div className="w-full space-y-2.5 mb-6">
        {events.map((item, idx) => {
          const isCorrectPosition = isWon || (hasChecked && (idx === 0 || events[idx - 1].year <= item.year));

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                isWon
                  ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                  : "bg-purple-950/50 border-purple-700/50 hover:border-amber-400/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-900/60 border border-purple-600 flex items-center justify-center font-bold text-xs text-amber-300 font-mono flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white leading-snug">{item.title}</div>
                  <div className="text-[11px] text-purple-300/70 mt-0.5">{item.description}</div>
                  {isWon && (
                    <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                      📅 Anul: {item.year}
                    </div>
                  )}
                </div>
              </div>

              {!isWon && (
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded bg-purple-900/60 hover:bg-amber-400 hover:text-purple-950 text-purple-200 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === events.length - 1}
                    className="p-1 rounded bg-purple-900/60 hover:bg-amber-400 hover:text-purple-950 text-purple-200 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Win / Action Button */}
      {isWon ? (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Cronologie Rezolvată pentru Echipă!
        </div>
      ) : (
        <Button onClick={checkOrder} className="gold-btn w-full py-4 font-heading tracking-wider">
          VERIFICĂ CRONOLOGIA
        </Button>
      )}
    </div>
  );
}
