import { t, getLanguage } from "@/lib/i18n";
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

  // Password reset states
  const [resetStep, setResetStep] = useState<"idle" | "email" | "code" | "newPassword">("idle");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

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

  // ── Password Reset Handlers ────────────────────────────────────────────────
  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResetError("");
    setResetMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, language: getLanguage() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.message || t("Eroare la trimiterea codului"));
      } else {
        setResetMessage(data.message);
        setResetStep("code");
      }
    } catch {
      setResetError(t("Eroare de conexiune"));
    }
    setIsSubmitting(false);
  };

  const handleForgotVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError(t("Parolele nu se potrivesc."));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          code: resetCode,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.message || t("Eroare la resetarea parolei"));
      } else {
        setResetMessage(data.message);
        setResetStep("idle");
        // Pre-fill the login email so the user can log in immediately
        setLoginEmail(resetEmail);
        setResetEmail("");
        setResetCode("");
        setResetNewPassword("");
        setResetConfirmPassword("");
      }
    } catch {
      setResetError(t("Eroare de conexiune"));
    }
    setIsSubmitting(false);
  };

  const exitResetFlow = () => {
    setResetStep("idle");
    setResetEmail("");
    setResetCode("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
    setResetMessage("");
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
             {t("PORTALUL TRANSILVANIA TRIVIA")} </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
             {t("Intră în arenă, formează o echipă sau revendică-ți locul de Căpitan!")} </DialogDescription>
        </DialogHeader>


        <Tabs value={user ? "team" : activeTab} onValueChange={user ? undefined : setActiveTab} className="w-full">
          <TabsList className={`grid ${user ? "grid-cols-1" : "grid-cols-3"} bg-purple-950/60 border border-purple-800/40`}>
            {!user && (
              <>
                <TabsTrigger value="login" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 font-heading tracking-wider">
                   {t("Conectare")} </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 font-heading tracking-wider">
                   {t("Cont Nou")} </TabsTrigger>
              </>
            )}
            <TabsTrigger value="team" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 font-heading tracking-wider">
              {user ? t("Alege o Echipă") : t("Echipă")}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: LOGIN */}
          <TabsContent value="login" className="space-y-4 pt-3">
            {resetStep === "idle" ? (
              <>
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
                    <Label className="text-xs text-muted-foreground">{t("Parolă")}</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between pb-1 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="keepLoggedInLogin"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-purple-700/50 bg-purple-950/30 text-amber-500"
                      />
                      <Label htmlFor="keepLoggedInLogin" className="text-xs text-muted-foreground cursor-pointer">
                         {t("Ține-mă conectat")} </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setResetStep("email"); setResetMessage(""); setResetError(""); }}
                      className="text-xs text-amber-400/80 hover:text-amber-300 hover:underline transition-colors cursor-pointer"
                    >
                       {t("Ai uitat parola?")} </button>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full gold-btn font-heading tracking-widest text-base">
                    {isSubmitting ? "CONECTARE..." : t("INTRĂ ÎN CONT")}
                  </Button>
                </form>
                {resetMessage && (
                  <p className="text-xs text-green-400 text-center bg-green-400/10 rounded p-2 border border-green-400/20">{t(resetMessage)}</p>
                )}
              </>
            ) : resetStep === "email" ? (
              /* ── Step 1: Enter email ─────────────────────────────── */
              <div className="space-y-3">
                <div className="text-center space-y-1">
                  <KeyRound className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                     {t("Introdu adresa de email asociată contului tău și îți vom trimite un cod de resetare.")} </p>
                </div>
                <form onSubmit={handleForgotSendCode} className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      placeholder="vlad@transilvaniatrivia.ro"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                      required
                      autoFocus
                    />
                  </div>
                  {resetError && (
                    <p className="text-xs text-red-400 text-center bg-red-400/10 rounded p-2 border border-red-400/20">{t(resetError)}</p>
                  )}
                  <Button type="submit" disabled={isSubmitting} className="w-full gold-btn font-heading tracking-widest text-sm">
                    {isSubmitting ? t("SE TRIMITE...") : t("TRIMITE CODUL")}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={exitResetFlow}
                  className="w-full text-xs text-muted-foreground hover:text-amber-300 transition-colors cursor-pointer"
                >
                   {t("← Înapoi la conectare")} </button>
              </div>
            ) : resetStep === "code" ? (
              /* ── Step 2: Enter code + new password ──────────────── */
              <div className="space-y-3">
                <div className="text-center space-y-1">
                  <Shield className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                     {t("Am trimis un cod de 6 cifre la")} <span className="text-amber-300 font-medium">{resetEmail}</span>{t(". Introdu codul și noua parolă.")} </p>
                </div>
                <form onSubmit={handleForgotVerifyCode} className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Cod de verificare")}</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm font-mono text-center tracking-[0.5em] text-lg"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Parola nouă")}</Label>
                    <Input
                      type="password"
                      placeholder={t("Cel puțin 6 caractere")}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Confirmă parola nouă")}</Label>
                    <Input
                      type="password"
                      placeholder={t("Repetă parola")}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="bg-purple-950/30 border-purple-700/50 focus:border-amber-400 text-sm"
                      required
                    />
                  </div>
                  {resetError && (
                    <p className="text-xs text-red-400 text-center bg-red-400/10 rounded p-2 border border-red-400/20">{t(resetError)}</p>
                  )}
                  <Button type="submit" disabled={isSubmitting || resetCode.length !== 6} className="w-full gold-btn font-heading tracking-widest text-sm">
                    {isSubmitting ? t("SE PROCESEAZĂ...") : t("SCHIMBĂ PAROLA")}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={exitResetFlow}
                  className="w-full text-xs text-muted-foreground hover:text-amber-300 transition-colors cursor-pointer"
                >
                   {t("← Înapoi la conectare")} </button>
              </div>
            ) : null}
          </TabsContent>

          {/* TAB 2: REGISTER */}
          <TabsContent value="register" className="space-y-4 pt-3">
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("Nume / Nickname")}</Label>
                <Input
                  type="text"
                  placeholder={t("Ex: Alexandru Cavalerul")}
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
                <Label className="text-xs text-muted-foreground">{t("Parolă")}</Label>
                <Input
                  type="password"
                  placeholder={t("Cel puțin 6 caractere")}
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
                   {t("Ține-mă conectat")} </Label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full gold-btn font-heading tracking-widest text-base">
                {isSubmitting ? t("CREARE CONT...") : t("CREEAZĂ CONTUL")}
              </Button>
            </form>
          </TabsContent>

          {/* TAB 3: TEAM MANAGEMENT */}
          <TabsContent value="team" className="space-y-4 pt-3">
            {user ? (
              <div className="space-y-4">
                {team ? (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-400/40 text-center space-y-2">
                    <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold">{t("Echipa Ta Activă")}</div>
                    <div className="font-heading text-2xl text-gold-gradient">{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                       {t("Cod de invitație pentru prieteni:")} <span className="font-mono font-bold text-amber-400 text-sm bg-purple-950/80 px-2 py-0.5 rounded border border-amber-400/30">{team.inviteCode}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Create Team Option */}
                    <div className="p-3 bg-purple-950/30 rounded border border-purple-700/40">
                      <h4 className="font-heading text-lg text-amber-300 flex items-center gap-1.5 mb-2">
                         {t("👑 Creează o Echipă Nouă (Devino Căpitan)")} </h4>
                      <form onSubmit={handleCreateTeam} className="space-y-2">
                        <Input
                          placeholder={t("Numele Echipei (ex: Dragonii din Cluj)")}
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="bg-purple-950/50 border-purple-700/50 text-sm"
                          required
                        />
                        <Input
                          placeholder={t("Motto / Tagline (opțional)")}
                          value={teamTagline}
                          onChange={(e) => setTeamTagline(e.target.value)}
                          className="bg-purple-950/50 border-purple-700/50 text-sm"
                        />
                        <Button type="submit" className="w-full gold-btn text-xs font-heading">
                           {t("FORMEAZĂ ECHIPA & GENEREAZĂ COD")} </Button>
                      </form>
                    </div>

                    {/* Join Team Option */}
                    <div className="p-3 bg-purple-950/30 rounded border border-purple-700/40">
                      <h4 className="font-heading text-lg text-purple-300 flex items-center gap-1.5 mb-2">
                         {t("🛡️ Alătură-te unei Echipe Existente")} </h4>
                      <form onSubmit={handleJoinTeam} className="space-y-2">
                        <Input
                          placeholder={t("Introdu Codul de Invitație (ex: NOCT-77)")}
                          value={inviteCodeInput}
                          onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                          className="bg-purple-950/50 border-purple-700/50 text-sm font-mono"
                          required
                        />
                        <Button type="submit" className="w-full purple-btn text-xs font-heading">
                           {t("INTRĂ ÎN ECHIPĂ")} </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                 {t("Te rugăm să te conectezi mai întâi pentru a crea sau gestiona o echipă.")} </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
