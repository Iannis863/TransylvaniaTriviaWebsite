import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Crown, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Flame,
  AlertCircle
} from "lucide-react";

export interface RegisteredTeamItem {
  id: string;
  teamName: string;
  captainName: string;
  memberCount: number;
  registeredAt: string;
  teamId?: string | null;
}

export interface RegisteredTeamsGridProps {
  teams: RegisteredTeamItem[];
  maxTeams: number;
  editionLabel: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function RegisteredTeamsGrid({
  teams,
  maxTeams = 25,
  editionLabel,
}: RegisteredTeamsGridProps) {
  const percentageOccupied = Math.min(100, Math.round((teams.length / maxTeams) * 100));

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Header & Capacity Telemetry */}
        <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-2xl mb-8">
          <div className="p-6 sm:p-8 rounded-[calc(2.5rem-0.5rem)] bg-[#0e041d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2 border-purple-800/40">
              <div className="text-center md:text-left">
                <div className="text-[10px] text-amber-400 uppercase tracking-widest font-bold flex items-center justify-center md:justify-start gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  Echipe Înregistrate Live
                </div>
                <h3 className="text-2xl sm:text-3xl font-heading text-gold-gradient tracking-wider">
                  GRILA DE START • {editionLabel}
                </h3>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  Lista publică a echipelor validate pentru confruntarea de marți
                </p>
              </div>

              {/* Progress & Slots Counter */}
              <div className="w-full md:w-64 text-center md:text-right">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-purple-300">Capacitate Restaurant:</span>
                  <span className="text-amber-400 font-mono">{teams.length} / {maxTeams} Echipe</span>
                </div>
                <Progress value={percentageOccupied} className="h-2.5 bg-purple-950 border border-purple-800" />
                <div className="text-[11px] text-purple-400/80 mt-1">
                  {maxTeams - teams.length > 0 
                    ? `Mai sunt ${maxTeams - teams.length} mese disponibile` 
                    : "Toate locurile au fost epuizate!"}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Squad Cards Grid */}
        {teams.length === 0 ? (
          <div className="text-center py-12 p-6 rounded-2xl bg-purple-950/20 border border-purple-800/40">
            <Users className="w-10 h-10 text-purple-500/50 mx-auto mb-2" />
            <p className="text-sm text-purple-300/70">Încă nu s-a înregistrat nicio echipă.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team, idx) => (
              <div
                key={team.id || idx}
                className="p-1 rounded-2xl bg-purple-950/30 border border-purple-800/50 hover:border-amber-400/50 transition-all hover:-translate-y-0.5 group shadow-lg"
              >
                <div className="p-4 rounded-xl bg-[#110523] h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-[10px] font-bold text-amber-300 font-mono">
                          #{idx + 1}
                        </span>
                        <h4 className="font-heading text-base text-white tracking-wide truncate max-w-[170px] group-hover:text-amber-300 transition-colors">
                          {team.teamName}
                        </h4>
                      </div>
                      <Badge className="bg-purple-900/60 border-purple-600/40 text-purple-200 text-[10px] px-2 py-0.5">
                        {team.memberCount} {team.memberCount === 1 ? "membru" : "membri"}
                      </Badge>
                    </div>

                    <div className="text-xs text-purple-300/80 flex items-center gap-1.5 mt-2">
                      <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="truncate">Căpitan: <strong>{team.captainName}</strong></span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-purple-800/40 flex items-center justify-between text-[10px] text-purple-400/70 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400/90 font-sans">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Masă Confirmată
                    </span>
                    <span>
                      {new Date(team.registeredAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
