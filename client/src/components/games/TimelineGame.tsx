import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Heart, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentWeeklyGameData } from "../../lib/weeklyGames";

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

const weeklyData = getCurrentWeeklyGameData();
const ALL_EVENTS: TimelineEvent[] = weeklyData.timelineEvents.map(e => ({
  id: e.id,
  title: e.content,
  year: e.year,
  description: e.content,
}));

export default function TimelineGame({ onSolve, isAlreadySolved = false }: TimelineGameProps) {
  const { toast } = useToast();
  
  // Timdle State - Dynamic Initialization
  const initialEvent = ALL_EVENTS.length > 0 ? ALL_EVENTS[Math.floor(ALL_EVENTS.length / 2)] : null;
  const remainingEvents = ALL_EVENTS.filter(e => e.id !== initialEvent?.id).sort(() => Math.random() - 0.5);

  const [placedEvents, setPlacedEvents] = useState<TimelineEvent[]>(
    isAlreadySolved ? [...ALL_EVENTS].sort((a,b) => a.year - b.year) : (initialEvent ? [initialEvent] : [])
  );
  
  const [upcomingEvents, setUpcomingEvents] = useState<TimelineEvent[]>(
    isAlreadySolved ? [] : remainingEvents
  );
  
  const [lives, setLives] = useState(3);
  const [isWon, setIsWon] = useState(isAlreadySolved);
  const [isLost, setIsLost] = useState(false);

  const activeEvent = upcomingEvents[0];

  const handlePlaceEvent = (insertIndex: number) => {
    if (isWon || isLost || !activeEvent) return;

    // Determine correct insertion index mathematically
    const sortedWithNew = [...placedEvents, activeEvent].sort((a, b) => a.year - b.year);
    const correctIndex = sortedWithNew.findIndex(e => e.id === activeEvent.id);

    if (insertIndex === correctIndex) {
      // Correct guess!
      toast({ title: "Corect!", description: `Ai plasat evenimentul corect la anul ${activeEvent.year}.` });
      setPlacedEvents(sortedWithNew);
    } else {
      // Wrong guess
      const newLives = lives - 1;
      setLives(newLives);
      toast({ title: "Incorect!", description: `Evenimentul era din anul ${activeEvent.year}.`, variant: "destructive" });
      
      if (newLives <= 0) {
        setIsLost(true);
        toast({ title: "Joc Pierdut", description: "Ai rămas fără vieți! Încearcă din nou echipa ta.", variant: "destructive" });
        return;
      } else {
        // Still have lives, place it correctly anyway (like Timdle)
        setPlacedEvents(sortedWithNew);
      }
    }

    const nextUpcoming = upcomingEvents.slice(1);
    setUpcomingEvents(nextUpcoming);

    if (nextUpcoming.length === 0 && lives > 0) {
      setIsWon(true);
      toast({ title: "🎉 Cronologie Completă!", description: "Ai reconstruit linia temporală istorică!" });
      onSolve({ completed: true, livesLeft: lives });
    }
  };

  const handleRestart = () => {
    setPlacedEvents([ALL_EVENTS[3]]);
    setUpcomingEvents([ALL_EVENTS[0], ALL_EVENTS[5], ALL_EVENTS[2], ALL_EVENTS[4], ALL_EVENTS[1]]);
    setLives(3);
    setIsLost(false);
  };

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full">
      <div className="text-center mb-4 flex flex-col items-center">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-2">
          Cronologia Istoriei
        </Badge>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((life) => (
            <Heart 
              key={life} 
              className={`w-5 h-5 transition-colors duration-500 ${life <= lives ? "text-red-500 fill-red-500" : "text-zinc-700 fill-zinc-800"}`} 
            />
          ))}
        </div>
      </div>

      {/* Active Event Card (The one to place) */}
      {!isWon && !isLost && activeEvent && (
        <div className="w-full mb-8 relative">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest text-center mb-2">Eveniment Curent</div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            key={activeEvent.id}
            className="p-4 rounded-xl bg-purple-600/40 border-2 border-amber-400 shadow-[0_0_20px_rgba(246,184,40,0.3)] text-center relative z-10"
          >
            <h3 className="text-lg font-bold text-white mb-1">{activeEvent.title}</h3>
            <p className="text-sm text-purple-200">{activeEvent.description}</p>
          </motion.div>
        </div>
      )}

      {/* Timeline Board */}
      <div className="w-full space-y-1 pb-4 relative">
        <AnimatePresence>
          {placedEvents.map((item, idx) => (
            <div key={item.id}>
              {/* Insert Gap Above */}
              {!isWon && !isLost && (
                <div className="w-full flex justify-center my-2 opacity-0 hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handlePlaceEvent(idx)}
                    className="flex items-center justify-center w-full max-w-[200px] h-8 rounded-full bg-amber-500 text-purple-950 font-bold hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Plasează Aici
                  </button>
                </div>
              )}
              {!isWon && !isLost && (
                <div className="h-4 w-full flex justify-center pointer-events-none">
                  <div className="w-0.5 h-full bg-purple-700/50" />
                </div>
              )}

              {/* Placed Event */}
              <motion.div
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/70 border-purple-500/50 shadow"
              >
                <div className="text-left">
                  <div className="text-sm font-bold text-white leading-snug">{item.title}</div>
                </div>
                <div className="flex-shrink-0 bg-purple-900/80 px-3 py-1 rounded border border-purple-700 text-amber-300 font-mono font-bold text-lg text-center">
                  {item.year}
                </div>
              </motion.div>
              
              {!isWon && !isLost && idx === placedEvents.length - 1 && (
                <div className="h-4 w-full flex justify-center pointer-events-none">
                  <div className="w-0.5 h-full bg-purple-700/50" />
                </div>
              )}

              {/* Insert Gap Below Last Element */}
              {!isWon && !isLost && idx === placedEvents.length - 1 && (
                <div className="w-full flex justify-center my-2 opacity-0 hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handlePlaceEvent(idx + 1)}
                    className="flex items-center justify-center w-full max-w-[200px] h-8 rounded-full bg-amber-500 text-purple-950 font-bold hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Plasează Aici
                  </button>
                </div>
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game State Banner */}
      {isWon && (
        <div className="w-full mt-4 p-4 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Cronologie Rezolvată!
        </div>
      )}

      {isLost && (
        <div className="w-full mt-4">
          <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-center text-sm font-semibold mb-4">
            Ai rămas fără vieți!
          </div>
          <Button onClick={handleRestart} className="w-full bg-purple-800 hover:bg-purple-700 text-white font-bold">
            Încearcă Din Nou
          </Button>
        </div>
      )}
    </div>
  );
}
