import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gamepad2, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Scroll, 
  RotateCcw,
  Puzzle,
  Compass,
  ListOrdered,
  Layers,
  FileText,
  HelpCircle
} from "lucide-react";

import WordleGame from "./games/WordleGame";
import SudokuGame from "./games/SudokuGame";
import CrosswordGame from "./games/CrosswordGame";
import TimelineGame from "./games/TimelineGame";
import ConnectionsGame from "./games/ConnectionsGame";
import GlobleMapGame from "./games/GlobleMapGame";
import SecretClueModal from "./games/SecretClueModal";

interface MiniGamesHubProps {
  editionId: string;
  editionNumber: number;
  theme: string;
  secretClue: string;
}

export default function MiniGamesHub({
  editionId,
  editionNumber,
  theme,
  secretClue,
}: MiniGamesHubProps) {
  const { user, team } = useAuth();
  const { toast } = useToast();
  const [activeGameTab, setActiveGameTab] = useState("wordle");
  const [isClueModalOpen, setIsClueModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Solved state per game type (collaborative progress)
  const [solvedGames, setSolvedGames] = useState<Record<string, boolean>>({
    WORDLE: false,
    SUDOKU: false,
    REBUS: false,
    TIMELINE: false,
    CONNECTIONS: false,
    GLOBLE: false,
  });

  // Fetch team puzzle progress from server
  const fetchProgress = async () => {
    try {
      const teamId = team?.id || "team_night_scholars";
      const res = await fetch(`/api/games/progress/${editionId}?teamId=${teamId}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, boolean> = {
          WORDLE: false,
          SUDOKU: false,
          REBUS: false,
          TIMELINE: false,
          CONNECTIONS: false,
          GLOBLE: false,
        };
        Object.entries(data.games || {}).forEach(([key, val]: [string, any]) => {
          map[key] = !!val.isSolved;
        });
        setSolvedGames(map);
      }
    } catch (err) {
      console.error("Failed to fetch game progress:", err);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [editionId, team]);

  const handleGameSolved = async (gameType: string, payloadData: any) => {
    setSolvedGames((prev) => ({ ...prev, [gameType]: true }));
    try {
      await fetch("/api/games/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team?.id || "team_night_scholars",
          editionId,
          gameType,
          isSolved: true,
          solvedByUserId: user?.id || null,
          data: payloadData,
        }),
      });
      await fetchProgress();
    } catch (err) {
      console.error("Error saving puzzle solve:", err);
    }
  };

  const handleResetProgress = async () => {
    setIsResetting(true);
    try {
      const teamId = team?.id || "team_night_scholars";
      const res = await fetch("/api/games/progress/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, editionId }),
      });
      if (res.ok) {
        setSolvedGames({
          WORDLE: false,
          SUDOKU: false,
          REBUS: false,
          TIMELINE: false,
          CONNECTIONS: false,
          GLOBLE: false,
        });
        toast({ title: "Progres Resetat", description: "Toate cele 6 puzzle-uri au fost resetate la 0/6 pentru testare." });
      }
    } catch (err) {
      toast({ title: "Eroare", description: "Nu s-a putut reseta progresul", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  const solvedCount = Object.values(solvedGames).filter(Boolean).length;
  const allSolved = solvedCount === 6;

  const gamesConfig = [
    { id: "wordle", type: "WORDLE", name: "1. Wordle", desc: "Cuvântul Săptămânii (6 Litere)", icon: FileText },
    { id: "sudoku", type: "SUDOKU", name: "2. Sudoku", desc: "Criptograma Gotică 6x6", icon: Puzzle },
    { id: "crossword", type: "REBUS", name: "3. Rebus", desc: "Cuvinte Încrucișate", icon: HelpCircle },
    { id: "timeline", type: "TIMELINE", name: "4. Cronologie", desc: "Ordonare Evenimente", icon: ListOrdered },
    { id: "connections", type: "CONNECTIONS", name: "5. Conexiuni", desc: "4 Categorii din 16 Cuvinte", icon: Layers },
    { id: "globle", type: "GLOBLE", name: "6. Harta Mistică", desc: "Ghicește Orașul Transilvănean", icon: Compass },
  ];

  return (
    <section id="games" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Antrenament Săptămânal Colaborativ
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading tracking-widest text-gold-gradient">
            CENTRUL DE MINI-JOCURI ALE ECHIPEI
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-2 font-light">
            Fiecare membru poate rezolva puzzle-uri în numele echipei. Finalizarea completă (6/6) rupe sigiliul secret pentru marți seară!
          </p>
        </div>

        {/* Double-Bezel Status & Unlock Vault Shell */}
        <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-[0_15px_40px_rgba(0,0,0,0.8)] mb-10">
          <div className="p-6 sm:p-8 rounded-[calc(2.5rem-0.5rem)] bg-[#0f051e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="flex items-center gap-4 text-left">
                <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-lg transition-all ${
                  allSolved 
                    ? "bg-amber-400 border-amber-200 text-purple-950 shadow-[0_0_25px_rgba(246,184,40,0.5)] animate-pulse" 
                    : "bg-purple-950/90 border-purple-600/50 text-amber-300"
                }`}>
                  {allSolved ? <Crown className="w-8 h-8 text-purple-950" /> : <Scroll className="w-8 h-8 text-amber-400" />}
                </div>
                
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-purple-300">
                    Progres Comun: <strong className="text-amber-300">{team ? team.name : "Echipa Ta"}</strong>
                  </div>
                  <div className="font-heading text-2xl sm:text-3xl text-white mt-0.5">
                    {solvedCount} DIN 6 JOCURI COMPLETATE
                  </div>
                  <div className="text-xs text-amber-300/90 font-medium mt-1">
                    {allSolved 
                      ? "✨ Toate cheile au fost obținute! Sigiliul este rupt." 
                      : `🔒 Sigiliul este blocat. Mai sunt ${6 - solvedCount} puzzle-uri de rezolvat.`}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <Button
                  onClick={() => setIsClueModalOpen(true)}
                  className={allSolved 
                    ? "gold-btn rounded-full px-6 py-6 font-heading text-base tracking-wider shadow-[0_0_25px_rgba(246,184,40,0.4)] group flex items-center gap-2" 
                    : "purple-btn rounded-full px-6 py-6 font-heading text-sm tracking-wider group flex items-center gap-2"}
                >
                  {allSolved ? (
                    <>
                      <Unlock className="w-5 h-5 text-purple-950" />
                      DESCHIDE PERGAMENTUL SECRET
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-purple-300" />
                      VERIFICĂ STAREA SIGILIULUI ({solvedCount}/6)
                    </>
                  )}
                  <span className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/15 flex items-center justify-center text-xs group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform">
                    →
                  </span>
                </Button>

                {/* Reset helper */}
                <button
                  type="button"
                  onClick={handleResetProgress}
                  disabled={isResetting}
                  className="text-xs text-purple-400/70 hover:text-amber-300 flex items-center gap-1 transition-colors px-2 py-1"
                  title="Resetează puzzle-urile la 0/6 pentru testare"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                  Resetează (0/6)
                </button>
              </div>

            </div>

            {/* Mini-Games Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-6 pt-5 border-t border-purple-800/40">
              {gamesConfig.map((g) => {
                const isSolved = solvedGames[g.type];
                return (
                  <div
                    key={g.id}
                    onClick={() => setActiveGameTab(g.id)}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      isSolved
                        ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                        : "bg-purple-950/40 border-purple-800/60 text-purple-300/70 hover:border-purple-600"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase truncate">{g.name}</div>
                    <div className="text-[11px] font-semibold mt-1 flex items-center justify-center gap-1">
                      {isSolved ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Rezolvat
                        </span>
                      ) : (
                        <span className="text-amber-400/70 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Nerezolvat
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Double-Bezel Interactive Game Arena Shell */}
        <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-purple-900/20 to-purple-950/10 ring-1 ring-purple-500/30 shadow-2xl">
          <div className="p-6 sm:p-10 rounded-[calc(2.5rem-0.5rem)] bg-[#0d041a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            
            <Tabs value={activeGameTab} onValueChange={setActiveGameTab} className="w-full">
              
              <TabsList className="grid grid-cols-3 sm:grid-cols-6 bg-purple-950/80 border border-purple-700/50 p-1.5 rounded-2xl mb-8">
                {gamesConfig.map((g) => {
                  const Icon = g.icon;
                  const isSolved = solvedGames[g.type];
                  return (
                    <TabsTrigger
                      key={g.id}
                      value={g.id}
                      className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{g.name.split(". ")[1]}</span>
                      {isSolved && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* TAB 1: WORDLE */}
              <TabsContent value="wordle">
                <WordleGame 
                  onSolve={(data) => handleGameSolved("WORDLE", data)} 
                  isAlreadySolved={solvedGames["WORDLE"]} 
                />
              </TabsContent>

              {/* TAB 2: SUDOKU */}
              <TabsContent value="sudoku">
                <SudokuGame 
                  onSolve={(data) => handleGameSolved("SUDOKU", data)} 
                  isAlreadySolved={solvedGames["SUDOKU"]} 
                />
              </TabsContent>

              {/* TAB 3: CROSSWORD */}
              <TabsContent value="crossword">
                <CrosswordGame 
                  onSolve={(data) => handleGameSolved("REBUS", data)} 
                  isAlreadySolved={solvedGames["REBUS"]} 
                />
              </TabsContent>

              {/* TAB 4: TIMELINE */}
              <TabsContent value="timeline">
                <TimelineGame 
                  onSolve={(data) => handleGameSolved("TIMELINE", data)} 
                  isAlreadySolved={solvedGames["TIMELINE"]} 
                />
              </TabsContent>

              {/* TAB 5: CONNECTIONS */}
              <TabsContent value="connections">
                <ConnectionsGame 
                  onSolve={(data) => handleGameSolved("CONNECTIONS", data)} 
                  isAlreadySolved={solvedGames["CONNECTIONS"]} 
                />
              </TabsContent>

              {/* TAB 6: GLOBLE MAP */}
              <TabsContent value="globle">
                <GlobleMapGame 
                  onSolve={(data) => handleGameSolved("GLOBLE", data)} 
                  isAlreadySolved={solvedGames["GLOBLE"]} 
                />
              </TabsContent>

            </Tabs>

          </div>
        </div>

      </div>

      {/* Secret Clue Card Modal (Strictly gated) */}
      <SecretClueModal
        isOpen={isClueModalOpen}
        onClose={() => setIsClueModalOpen(false)}
        secretClue={secretClue}
        theme={theme}
        editionNumber={editionNumber}
        solvedCount={solvedCount}
        totalGames={6}
        isUnlocked={allSolved}
      />
    </section>
  );
}
