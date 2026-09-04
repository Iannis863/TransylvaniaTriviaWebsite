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
  const { login, register, loginGoogle, createTeam, joinTeam, user, team } = useAuth();
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

  const handleGoogleDemo = async () => {
    setIsSubmitting(true);
    const success = await loginGoogle("Radu Voievod", "radu@transilvaniatrivia.ro", keepLoggedIn);
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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-purple-800/40" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#120722] px-2 text-muted-foreground">Sau</span></div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleDemo}
              variant="outline"
              className="w-full border-purple-600/40 hover:bg-purple-900/30 text-white flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.1 8.9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.1.2-1.9.4-2.7L1.6 6.4C.6 8.4 0 10.6 0 13s.6 4.6 1.6 6.6l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z"/>
              </svg>
              Continuă cu Google
            </Button>
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
