import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Crown, 
  Sparkles, 
  Copy, 
  Check, 
  Share2, 
  Trophy, 
  ShieldCheck, 
  Flame,
  ArrowRight,
  MoreHorizontal,
  UserX,
  ArrowUpCircle
} from "lucide-react";
import AuthModal from "./AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TeamDashboard() {
  const { user, team, teamMembers } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const copyInviteCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      toast({ title: "Cod copiat!", description: `Codul ${team.inviteCode} a fost copiat în clipboard.` });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyShareLink = () => {
    if (team?.inviteCode) {
      const link = `${window.location.origin}/?join=${team.inviteCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Link de invitație copiat!", description: "Trimite linkul prietenilor tăi." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { refreshAuth } = useAuth();
  const [isKicking, setIsKicking] = useState(false);

  const kickMember = async (memberId: string) => {
    if (!team) return;
    if (!confirm("Ești sigur că vrei să elimini acest membru din echipă?")) return;
    
    setIsKicking(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Eroare la eliminare");
      }
      toast({ title: "Membru eliminat", description: "Utilizatorul a fost scos din echipă." });
      await refreshAuth();
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setIsKicking(false);
    }
  };

  const promoteMember = async (memberId: string) => {
    if (!team) return;
    if (!confirm("Ești sigur că vrei să transferi titlul de Căpitan către acest membru? Vei deveni un simplu membru.")) return;
    
    setIsKicking(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/transfer-leadership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newLeaderId: memberId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Eroare la transfer");
      }
      toast({ title: "Transfer reușit", description: "Ai cedat titlul de Căpitan cu succes." });
      await refreshAuth();
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setIsKicking(false);
    }
  };

  if (!user) {
    return (
      <section id="team" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto p-2 rounded-[2.5rem] bg-amber-500/10 ring-1 ring-amber-400/30 shadow-2xl">
          <div className="p-8 sm:p-12 rounded-[calc(2.5rem-0.5rem)] bg-[#0e041d] text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/60 border border-amber-400 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-3xl font-heading tracking-wider text-gold-gradient mb-2">
              GESTIONEAZĂ-ȚI ECHIPA DE TRIVIA
            </h2>
            <p className="text-purple-200/80 text-sm max-w-md mx-auto mb-6">
              Autentifică-te pentru a crea o echipă, a genera codul de invitație sau a-ți administra membrii.
            </p>
            <Button onClick={() => setIsAuthOpen(true)} className="gold-btn rounded-full px-8 py-5 font-heading text-base tracking-wider">
              AUTENTIFICARE / ÎNREGISTRARE
            </Button>
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
          </div>
        </div>
      </section>
    );
  }

  if (!team) {
    return (
      <section id="team" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto p-2 rounded-[2.5rem] bg-purple-950/20 ring-1 ring-purple-500/30 shadow-2xl">
          <div className="p-8 sm:p-12 rounded-[calc(2.5rem-0.5rem)] bg-[#0e041d] text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/60 border border-purple-500 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-3xl font-heading text-gold-gradient mb-2">
              NU FACI PARTE DINTR-O ECHIPĂ ÎNCĂ
            </h2>
            <p className="text-purple-200/80 text-sm max-w-md mx-auto mb-6">
              Poți crea o echipă nouă pentru a deveni Căpitan sau te poți alătura echipei prietenilor tăi folosind codul de invitație.
            </p>
            <Button onClick={() => setIsAuthOpen(true)} className="gold-btn rounded-full px-8 py-5 font-heading text-base">
              FORMEAZĂ SAU INTRĂ ÎNTR-O ECHIPĂ
            </Button>
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} defaultTab="team" />
          </div>
        </div>
      </section>
    );
  }

  const isLeader = user.role === "TEAM_LEADER" || user.id === team.leaderId;

  return (
    <section id="team" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 mb-3 shadow-[0_0_15px_rgba(246,184,40,0.15)]">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Panoul de Comandă al Echipei
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading tracking-widest text-gold-gradient">
            {team.name.toUpperCase()}
          </h2>
          {team.tagline && (
            <p className="text-purple-300/80 text-sm sm:text-base italic max-w-lg mx-auto mt-1 font-serif">
              "{team.tagline}"
            </p>
          )}
        </div>

        {/* Double-Bezel Team Hub Card */}
        <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-2xl mb-8">
          <div className="p-6 sm:p-10 rounded-[calc(2.5rem-0.5rem)] bg-[#0e041d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-purple-800/40">
              
              {/* Stat 1: Role */}
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow">
                  {isLeader ? "👑" : "🛡️"}
                </div>
                <div>
                  <div className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">Rolul Tău</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {isLeader ? "Căpitan" : "Membru"}
                  </div>
                  <div className="text-xs text-amber-300 font-medium">
                    {isLeader ? "Administrează echipa" : "Rezolvă Jocuri"}
                  </div>
                </div>
              </div>

              {/* Stat 2: Members Count */}
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">Componența echipei</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {teamMembers.length} / 6 Membri
                  </div>
                  <div className="text-xs text-purple-300">
                    {6 - teamMembers.length > 0 ? `${6 - teamMembers.length} locuri libere` : "Echipă completă"}
                  </div>
                </div>
              </div>

              {/* Stat 3: Points / Standing */}
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">Punctajul echipei</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5 font-mono">
                    {team.score || 0} Puncte
                  </div>
                  <div className="text-xs text-purple-300 font-medium">Sezonul I</div>
                </div>
              </div>

            </div>

            {/* Invite Mechanics for Captain */}
            <div className="my-8 p-6 rounded-2xl bg-purple-950/50 border border-amber-400/40 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <div className="text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4" />
                  Invită-ți coechipierii
                </div>
                <div className="text-sm text-purple-200">
                  Trimite-le codul de alături pentru a intra în echipa ta.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-5 py-2.5 rounded-xl bg-black/60 border border-amber-400/60 font-mono text-lg font-bold text-amber-300 tracking-widest shadow-inner">
                  {team.inviteCode}
                </div>
                <Button
                  onClick={copyInviteCode}
                  className="gold-btn rounded-xl px-4 py-2 text-xs font-heading tracking-wider flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-purple-950" /> : <Copy className="w-4 h-4" />}
                  {copied ? "COPIAT!" : "COPIAZĂ"}
                </Button>
                <Button
                  onClick={copyShareLink}
                  variant="outline"
                  className="rounded-xl border-purple-500/40 text-purple-200 hover:bg-purple-900/30 text-xs flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  SHARE LINK
                </Button>
              </div>
            </div>

            {/* Roster of members */}
            <div>
              <h3 className="font-heading text-lg text-white tracking-wide mb-4 text-left flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Membrii Echipei ({teamMembers.length})
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="group p-3.5 rounded-xl bg-[#130626] border border-purple-800/40 flex items-center justify-between shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-700 to-amber-500 flex items-center justify-center text-sm shadow">
                        {member.avatar || (member.role === "TEAM_LEADER" ? "👑" : "👤")}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white truncate max-w-[120px]">{member.name}</div>
                        <div className="text-[10px] text-purple-300/70 font-mono truncate max-w-[120px]">{member.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={member.role === "TEAM_LEADER" ? "bg-amber-400 text-purple-950 text-[10px] font-bold" : "bg-purple-900/60 text-purple-200 text-[10px]"}>
                        {member.role === "TEAM_LEADER" ? "CĂPITAN" : "MEMBRU"}
                      </Badge>
                      {isLeader && member.role !== "TEAM_LEADER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-purple-400 hover:text-white bg-purple-900/40 rounded-full">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#120722] border-purple-800/40 text-purple-200">
                            <DropdownMenuItem onClick={() => promoteMember(member.id)} className="hover:bg-amber-500/20 hover:text-amber-300 focus:bg-amber-500/20 focus:text-amber-300 cursor-pointer">
                              <ArrowUpCircle className="w-4 h-4 mr-2" />
                              Promovează Căpitan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => kickMember(member.id)} className="hover:bg-red-500/20 hover:text-red-400 focus:bg-red-500/20 focus:text-red-400 cursor-pointer text-red-400">
                              <UserX className="w-4 h-4 mr-2" />
                              Elimină din Echipă
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
