import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Search, 
  Sparkles, 
  Crown, 
  ShieldCheck, 
  Clock, 
  RefreshCw,
  Trophy
} from "lucide-react";

export interface RegisteredTeamItem {
  id: string;
  teamName: string;
  captainName: string;
  memberCount: number;
  registeredAt: string;
  teamId?: string | null;
}

interface RegisteredTeamsGridProps {
  teams: RegisteredTeamItem[];
  maxTeams: number;
  editionLabel: string;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function RegisteredTeamsGrid({
  teams,
  maxTeams = 25,
  editionLabel,
  onRefresh,
  isLoading = false,
}: RegisteredTeamsGridProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = teams.filter((t) =>
    t.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.captainName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const percentage = Math.min(100, Math.round((teams.length / maxTeams) * 100));

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 5) return "Chiar acum";
      if (diffMinutes < 60) return `Acum ${diffMinutes} min`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Acum ${diffHours} ore`;
      const diffDays = Math.floor(diffHours / 24);
      return `Acum ${diffDays} zile`;
    } catch {
      return "Înscris recent";
    }
  };

  const getTeamIcon = (index: number) => {
    const icons = ["🧛", "⚔️", "🧙‍♂️", "🐺", "👑", "🔮", "🦇", "🛡️", "🐉", "📜"];
    return icons[index % icons.length];
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Header with Title & Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                Tablou Live Înscrieri
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading tracking-widest text-gold-gradient">
              ECHIPE ÎNREGISTRATE PENTRU {editionLabel.toUpperCase()}
            </h2>
            <p className="text-purple-300/80 text-xs sm:text-sm mt-0.5">
              Vezi rivalii care vor păși în arena Insomnia Restaurant marțea aceasta
            </p>
          </div>

          {/* Search & Refresh Controls */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Caută echipă sau căpitan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-xs h-10"
              />
            </div>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-purple-900/40 border border-purple-700/50 text-purple-300 hover:text-amber-300 hover:border-amber-400/50 transition-all flex items-center justify-center"
              title="Reîmprospătează lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Capacity Bar Card */}
        <div className="gold-card rounded-xl p-5 mb-8 border border-amber-400/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span className="font-heading text-lg text-white tracking-wider">
                CAPACITATE SALĂ: <span className="text-amber-400 font-bold">{teams.length}</span> DIN {maxTeams} ECHIPE
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">
              {maxTeams - teams.length > 0 ? (
                <span>🔥 Mai sunt <strong className="text-white text-sm">{maxTeams - teams.length}</strong> locuri libere!</span>
              ) : (
                <span className="text-red-400">Sold Out!</span>
              )}
            </span>
          </div>

          <div className="w-full bg-purple-950/80 rounded-full h-3.5 p-0.5 border border-purple-800/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-amber-400 to-amber-300 shadow-[0_0_15px_rgba(246,184,40,0.5)] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Teams Grid */}
        {filtered.length === 0 ? (
          <div className="gold-card rounded-2xl p-12 text-center border border-purple-800/40">
            <Users className="w-12 h-12 text-purple-400/60 mx-auto mb-3" />
            <h3 className="font-heading text-xl text-purple-200">Nu a fost găsită nicio echipă</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Fii prima echipă care își revendică masa pentru marțea aceasta!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((team, idx) => (
              <Card
                key={team.id}
                className="gold-card rounded-xl border border-purple-700/40 hover:border-amber-400/60 transition-all duration-300 group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-purple-900/60 border border-amber-400/30 flex items-center justify-center text-xl shadow group-hover:scale-105 transition-transform flex-shrink-0">
                        {getTeamIcon(idx)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-amber-400/80 font-bold">#{idx + 1}</span>
                          <h3 className="font-heading text-lg text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                            {team.teamName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-purple-300/80 mt-0.5">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>Căpitan: <strong>{team.captainName}</strong></span>
                        </div>
                      </div>
                    </div>

                    <Badge className="bg-purple-900/60 border-purple-600/40 text-purple-200 text-xs px-2 py-0.5 flex-shrink-0">
                      {team.memberCount} {team.memberCount === 1 ? "om" : "oameni"}
                    </Badge>

                  </div>

                  <div className="mt-4 pt-3 border-t border-purple-800/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Loc Confirmat
                    </span>
                    <span className="flex items-center gap-1 text-purple-300/70 font-mono">
                      <Clock className="w-3 h-3" /> {formatRelativeTime(team.registeredAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
