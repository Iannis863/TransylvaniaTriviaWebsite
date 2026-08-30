import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Crown, 
  Sparkles, 
  Copy, 
  Check, 
  Share2, 
  UserPlus, 
  Trophy, 
  ShieldCheck, 
  Flame,
  Award
} from "lucide-react";
import AuthModal from "./AuthModal";

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
      toast({ title: "Link de invitație copiat!", description: "Trimite linkul prietenilor tăi pe WhatsApp/Telegram." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <section id="team" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center gold-card p-12 rounded-3xl border border-amber-400/40 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-purple-900/60 border border-amber-400 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-3xl font-heading tracking-wider text-gold-gradient mb-2">
            GESTIONEAZĂ-ȚI ECHIPA DE TRIVIA
          </h2>
          <p className="text-purple-200/80 text-sm max-w-md mx-auto mb-6">
            Autentifică-te pentru a crea o echipă, a genera codul de invitație sau a-ți administra membrii.
          </p>
          <Button onClick={() => setIsAuthOpen(true)} className="gold-btn px-8 py-5 font-heading text-lg tracking-wider">
            AUTENTIFICARE / ÎNREGISTRARE
          </Button>
          <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
      </section>
    );
  }

  if (!team) {
    return (
      <section id="team" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center gold-card p-10 rounded-3xl border border-purple-700/50">
          <div className="w-14 h-14 rounded-full bg-purple-900/60 border border-purple-500 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-3xl font-heading text-gold-gradient mb-2">
            NU FACI PARTE DINTR-O ECHIPĂ ÎNCĂ
          </h2>
          <p className="text-purple-200/80 text-sm max-w-md mx-auto mb-6">
            Poți crea o echipă nouă pentru a deveni Căpitan sau te poți alătura echipei prietenilor tăi folosind codul de invitație.
          </p>
          <Button onClick={() => setIsAuthOpen(true)} className="gold-btn px-6 py-4 font-heading text-base">
            FORMEAZĂ SAU INTRĂ ÎNTR-O ECHIPĂ
          </Button>
          <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} defaultTab="team" />
        </div>
      </section>
    );
  }

  const isLeader = user.role === "TEAM_LEADER" || user.id === team.leaderId;

  return (
    <section id="team" className="py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs px-3 py-1 font-semibold uppercase tracking-wider mb-2">
            Panoul Echipei Tale
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading tracking-widest text-gold-gradient">
            {team.name.toUpperCase()}
          </h2>
          {team.tagline && (
            <p className="text-purple-200/90 italic text-sm mt-1">"{team.tagline}"</p>
          )}
        </div>

        {/* Top Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          {/* Card 1: Invite Code */}
          <Card className="gold-card border border-amber-400/40 p-5 rounded-2xl">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-purple-300 font-bold">Cod Invitație Echipă</span>
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-center justify-between bg-purple-950/80 p-3 rounded-xl border border-purple-700/60">
                <span className="font-mono text-2xl font-bold text-gold-gradient tracking-widest">
                  {team.inviteCode}
                </span>
                <button
                  onClick={copyInviteCode}
                  className="p-2 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 transition-colors"
                  title="Copiază codul"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={copyShareLink}
                variant="outline"
                size="sm"
                className="w-full text-xs border-purple-700 hover:bg-purple-900/40 text-purple-200 flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                Copiază Link Invitație WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Team Score */}
          <Card className="gold-card border border-purple-700/40 p-5 rounded-2xl">
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-purple-300 font-bold">Punctaj Acumulat</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-heading text-4xl text-amber-300 font-bold">
                {team.score} <span className="text-sm font-sans text-purple-300 font-normal">puncte</span>
              </div>
              <p className="text-xs text-purple-300/80">Locul #3 în clasamentul general al sezonului</p>
            </CardContent>
          </Card>

          {/* Card 3: Role & Permissions */}
          <Card className="gold-card border border-purple-700/40 p-5 rounded-2xl">
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-purple-300 font-bold">Rolul Tău</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-2xl text-white">
                  {isLeader ? "CĂPITAN DE ECHIPĂ" : "MEMBRU ACTIV"}
                </span>
              </div>
              <p className="text-xs text-purple-300/80">
                {isLeader ? "Ai dreptul de a înscrie echipa cu 1-click și de a gestiona membrii." : "Poți contribui la rezolvarea mini-jocurilor săptămânale."}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Team Members Roster */}
        <Card className="gold-card border border-purple-700/50 rounded-2xl overflow-hidden shadow-xl">
          <CardHeader className="bg-purple-950/50 border-b border-purple-800/40 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-2xl text-white tracking-wider">
                  MEMBRII ECHIPEI ({teamMembers.length || 2} / 6 LOCURI OCUPATE)
                </CardTitle>
                <CardDescription className="text-purple-300/80 text-xs">
                  Echipele au între 1 și maximum 6 membri la masa de concurs
                </CardDescription>
              </div>
              <Button
                onClick={copyShareLink}
                size="sm"
                className="gold-btn text-xs font-heading tracking-wider"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                INVITĂ COLEG
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3">
              {teamMembers.map((member, idx) => {
                const isMemberLeader = member.role === "TEAM_LEADER" || member.id === team.leaderId;
                return (
                  <div
                    key={member.id || idx}
                    className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-purple-600 flex items-center justify-center text-lg shadow">
                        {member.avatar || (isMemberLeader ? "👑" : "👤")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{member.name}</span>
                          {isMemberLeader && (
                            <Badge className="bg-amber-400 text-purple-950 text-[10px] font-bold">
                              CĂPITAN
                            </Badge>
                          )}
                          {member.id === user.id && (
                            <Badge variant="outline" className="border-purple-500 text-purple-300 text-[10px]">
                              TU
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-purple-300/70">{member.email}</span>
                      </div>
                    </div>

                    <div className="text-xs text-purple-300/80 font-mono">
                      {isMemberLeader ? "Lider & Înregistrator" : "Membru"}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </section>
  );
}
