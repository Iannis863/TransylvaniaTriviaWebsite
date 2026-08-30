import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
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
  HelpCircle,
  Puzzle,
  Compass,
  ListOrdered,
  Layers,
  FileText
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
  const [activeGameTab, setActiveGameTab] = useState("wordle");
  const [isClueModalOpen, setIsClueModalOpen] = useState(false);

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
        const map: Record<string, boolean> = {};
        Object.entries(data.games || {}).forEach(([key, val]: [string, any]) => {
          map[key] = !!val.isSolved;
        });
        setSolvedGames((prev) => ({ ...prev, ...map }));
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
    } catch (err) {
      console.error("Error saving puzzle solve:", err);
    }
  };

  const solvedCount = Object.values(solvedGames).filter(Boolean).length;
  const allSolved = solvedCount === 6;

  const gamesConfig = [
    { id: "wordle", type: "WORDLE", name: "1. Wordle", desc: "Cuvântul Săptămânii (6 Litere)", icon: FileText },
    { id: "sudoku", type: "SUDOKU", name: "2. Sudoku", desc: "Criptograma Gotică 6x6", icon: Puzzle },
    { id: "crossword", type: "REBUS", name: "3. Rebus", desc: "Cuvinte Încrucișate", icon: HelpCircle },
    { id: "timeline", type: "TIMELINE", name: "4. Cronologie", desc: "Ordonare Evenimente (Timdle)", icon: ListOrdered },
    { id: "connections", type: "CONNECTIONS", name: "5. Conexiuni", desc: "4 Categorii din 16 Cuvinte", icon: Layers },
    { id: "globle", type: "GLOBLE", name: "6. Harta Mistică", desc: "Ghicește Orașul Transilvănean", icon: Compass },
  ];

  return (
    <section id="games" className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-8">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/40 text-xs px-3 py-1 font-semibold uppercase tracking-wider mb-2">
            Antrenament Săptămânal Colaborativ
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading tracking-widest text-gold-gradient">
            CENTRUL DE MINI-JOCURI ALE ECHIPEI
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-2xl mx-auto mt-1">
            Fiecare membru poate contribui la rezolvare. Finalizarea tuturor celor 6 jocuri deblochează Pergamentul cu Indiciul Secret pentru marți!
          </p>
        </div>

        {/* Team Collaboration & Secret Lore Unlock Card */}
        <div className="gold-card rounded-2xl p-6 mb-8 border border-amber-400/40 shadow-[0_0_35px_rgba(246,184,40,0.15)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-4 text-left">
              <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl shadow transition-all ${
                allSolved 
                  ? "bg-amber-400 border-amber-200 text-purple-950 animate-bounce" 
                  : "bg-purple-950/80 border-purple-600/40 text-amber-300"
              }`}>
                {allSolved ? <Crown className="w-8 h-8 text-purple-950" /> : <Scroll className="w-7 h-7 text-amber-400" />}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-purple-300">
                  Progres Comun al Echipei • {team ? team.name : "Echipa Ta"}
                </div>
                <div className="font-heading text-xl sm:text-2xl text-white">
                  {solvedCount} DIN 6 JOCURI COMPLETATE
                </div>
                <div className="text-xs text-amber-300/90 font-medium mt-0.5">
                  {allSolved ? "✨ Pergamentul Secret a fost Descătușat!" : `Mai sunt ${6 - solvedCount} puzzle-uri de rezolvat pentru a debloca secretul.`}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsClueModalOpen(true)}
              className={allSolved ? "gold-btn px-6 py-5 font-heading text-base tracking-wider" : "purple-btn px-6 py-5 font-heading text-base tracking-wider"}
            >
              {allSolved ? (
                <>
                  <Unlock className="w-5 h-5 mr-2 text-purple-950" />
                  DESCHIDE PERGAMENTUL SECRET
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  PERGAMENT BLOCAT ({solvedCount}/6)
                </>
              )}
            </Button>

          </div>

          {/* Mini-Games Progress Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-5 pt-4 border-t border-purple-800/40">
            {gamesConfig.map((g) => {
              const isSolved = solvedGames[g.type];
              return (
                <div
                  key={g.id}
                  onClick={() => setActiveGameTab(g.id)}
                  className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                    isSolved
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-purple-950/40 border-purple-800 text-purple-300/70 hover:border-purple-600"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase truncate">{g.name}</div>
                  <div className="text-[11px] font-semibold mt-0.5 flex items-center justify-center gap-1">
                    {isSolved ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Rezolvat
                      </span>
                    ) : (
                      <span className="text-amber-400/80">În Așteptare</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Game Arena (Tabs) */}
        <Card className="gold-card border border-purple-700/50 p-4 sm:p-6 rounded-2xl shadow-xl">
          <Tabs value={activeGameTab} onValueChange={setActiveGameTab} className="w-full">
            
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 bg-purple-950/80 border border-purple-700/50 p-1 mb-6">
              {gamesConfig.map((g) => {
                const Icon = g.icon;
                const isSolved = solvedGames[g.type];
                return (
                  <TabsTrigger
                    key={g.id}
                    value={g.id}
                    className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider flex items-center gap-1.5 py-2"
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
        </Card>

      </div>

      {/* Secret Clue Card Modal */}
      <SecretClueModal
        isOpen={isClueModalOpen}
        onClose={() => setIsClueModalOpen(false)}
        secretClue={secretClue}
        theme={theme}
        editionNumber={editionNumber}
      />
    </section>
  );
}
