import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Shield, UserCheck, KeyRound, Users } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register" | "team";
}

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const { login, register, createTeam, joinTeam, user, team } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamTagline, setTeamTagline] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(loginEmail, loginPassword, keepLoggedIn);
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await register(regName, regEmail, regPassword, keepLoggedIn);
    setIsSubmitting(false);
    if (success) onClose();
  };


  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await createTeam(teamName, teamTagline);
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await joinTeam(inviteCodeInput);
    setIsSubmitting(false);
    if (success) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-[#120722] border border-amber-400/30 text-foreground p-6 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500/20 to-purple-500/30 border border-amber-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(246,184,40,0.3)]">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-heading tracking-widest text-gold-gradient">
            PORTALUL TRANSILVANIA TRIVIA
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Intră în arenă, formează o echipă sau revendică-ți locul de Căpitan!
          </DialogDescription>
        </DialogHeader>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 bg-purple-950/60 border border-purple-800/40">
            <TabsTrigger value="login" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 font-heading tracking-wider">
              Conectare
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 font-heading tracking-wider">
              Cont Nou
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 font-heading tracking-wider">
              Echipă
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: LOGIN */}
          <TabsContent value="login" className="space-y-4 pt-3">
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  placeholder="vlad@transilvaniatrivia.ro"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Parolă</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                  required
                />
              </div>
              <div className="flex items-center gap-2 pb-1 pt-1">
                <input
                  type="checkbox"
                  id="keepLoggedInLogin"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-purple-700/50 bg-purple-950/30 text-amber-500"
                />
                <Label htmlFor="keepLoggedInLogin" className="text-xs text-muted-foreground cursor-pointer">
                  Ține-mă conectat
                </Label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full gold-btn font-heading tracking-widest text-base">
                {isSubmitting ? "CONECTARE..." : "INTRĂ ÎN CONT"}
              </Button>
            </form>


          </TabsContent>

          {/* TAB 2: REGISTER */}
          <TabsContent value="register" className="space-y-4 pt-3">
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nume / Nickname</Label>
                <Input
                  type="text"
                  placeholder="Ex: Alexandru Cavalerul"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  placeholder="alex@exemplu.ro"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Parolă</Label>
                <Input
                  type="password"
                  placeholder="Cel puțin 6 caractere"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                  required
                />
              </div>
              <div className="flex items-center gap-2 pb-1 pt-1">
                <input
                  type="checkbox"
                  id="keepLoggedInReg"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-purple-700/50 bg-purple-950/30 text-amber-500"
                />
                <Label htmlFor="keepLoggedInReg" className="text-xs text-muted-foreground cursor-pointer">
                  Ține-mă conectat
                </Label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full gold-btn font-heading tracking-widest text-base">
                {isSubmitting ? "CREARE CONT..." : "CREEAZĂ CONTUL"}
              </Button>
            </form>
          </TabsContent>

          {/* TAB 3: TEAM MANAGEMENT */}
          <TabsContent value="team" className="space-y-4 pt-3">
            {user ? (
              <div className="space-y-4">
                {team ? (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-400/40 text-center space-y-2">
                    <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold">Echipa Ta Activă</div>
                    <div className="font-heading text-2xl text-gold-gradient">{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Cod de invitație pentru prieteni: <span className="font-mono font-bold text-amber-400 text-sm bg-purple-950/80 px-2 py-0.5 rounded border border-amber-400/30">{team.inviteCode}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Create Team Option */}
                    <div className="p-3 bg-purple-950/30 rounded border border-purple-700/40">
                      <h4 className="font-heading text-lg text-amber-300 flex items-center gap-1.5 mb-2">
                        👑 Creează o Echipă Nouă (Devino Căpitan)
                      </h4>
                      <form onSubmit={handleCreateTeam} className="space-y-2">
                        <Input
                          placeholder="Numele Echipei (ex: Dragonii din Cluj)"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="bg-purple-950/50 border-purple-700/50 text-sm"
                          required
                        />
                        <Input
                          placeholder="Motto / Tagline (opțional)"
                          value={teamTagline}
                          onChange={(e) => setTeamTagline(e.target.value)}
                          className="bg-purple-950/50 border-purple-700/50 text-sm"
                        />
                        <Button type="submit" className="w-full gold-btn text-xs font-heading">
                          FORMEAZĂ ECHIPA & GENEREAZĂ COD
                        </Button>
                      </form>
                    </div>

                    {/* Join Team Option */}
                    <div className="p-3 bg-purple-950/30 rounded border border-purple-700/40">
                      <h4 className="font-heading text-lg text-purple-300 flex items-center gap-1.5 mb-2">
                        🛡️ Alătură-te unei Echipe Existente
                      </h4>
                      <form onSubmit={handleJoinTeam} className="space-y-2">
                        <Input
                          placeholder="Introdu Codul de Invitație (ex: NOCT-77)"
                          value={inviteCodeInput}
                          onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                          className="bg-purple-950/50 border-purple-700/50 text-sm font-mono"
                          required
                        />
                        <Button type="submit" className="w-full purple-btn text-xs font-heading">
                          INTRĂ ÎN ECHIPĂ
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Te rugăm să te conectezi mai întâi pentru a crea sau gestiona o echipă.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
