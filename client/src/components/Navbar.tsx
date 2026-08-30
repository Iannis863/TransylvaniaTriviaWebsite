import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Crown, 
  Users, 
  Gamepad2, 
  BookOpen, 
  Copy, 
  Check, 
  LogOut, 
  LogIn, 
  Menu,
  X
} from "lucide-react";
import AuthModal from "./AuthModal";

interface NavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  editionLabel?: string;
}

export default function Navbar({ activeSection, onNavigate, editionLabel = "Marți 20:00" }: NavbarProps) {
  const { user, team, logout } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copyInviteCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { id: "hero", label: "Eveniment", icon: Sparkles },
    { id: "registration", label: "Înscrieri", icon: Users },
    { id: "games", label: "Mini-Jocuri", icon: Gamepad2 },
    { id: "rulebook", label: "Regulament", icon: BookOpen },
    { id: "prizes", label: "Premii & Locație", icon: Crown },
    { id: "team", label: "Echipa Mea", icon: Crown },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none">
        <header className="pointer-events-auto max-w-5xl mx-auto mt-3 sm:mt-5 rounded-full p-1.5 sm:p-2 bg-[#0c0317]/85 backdrop-blur-2xl ring-1 ring-amber-400/30 shadow-[0_15px_40px_rgba(0,0,0,0.85)] flex items-center justify-between gap-2 transition-all duration-300">
          
          {/* Brand Mark */}
          <div 
            onClick={() => onNavigate("hero")}
            className="flex items-center gap-2.5 pl-2 sm:pl-3 cursor-pointer group flex-shrink-0"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden p-0.5 ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(246,184,40,0.3)] group-hover:scale-105 transition-transform">
              <img 
                src="/logo-main.png" 
                alt="Transilvania Trivia" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg sm:text-xl text-gold-gradient tracking-widest leading-none drop-shadow">
                TRANSILVANIA TRIVIA
              </span>
              <span className="text-[10px] text-purple-300/80 font-medium tracking-wide flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                {editionLabel}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Pill architecture) */}
          <nav className="hidden lg:flex items-center gap-1 bg-purple-950/40 p-1 rounded-full border border-purple-800/40">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    isActive 
                      ? "bg-amber-400 text-purple-950 font-bold shadow-[0_0_15px_rgba(246,184,40,0.4)]" 
                      : "text-purple-200/80 hover:text-white hover:bg-purple-900/40"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-purple-950" : "text-amber-400/80"}`} />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right User / Auth Status */}
          <div className="flex items-center gap-2 pr-1 sm:pr-2">
            {user ? (
              <div className="flex items-center gap-1.5">
                {team && (
                  <button
                    onClick={copyInviteCode}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/50 border border-purple-600/40 hover:border-amber-400/60 text-[11px] font-mono transition-colors text-purple-200"
                    title="Copiază codul de invitație pentru coechipieri"
                  >
                    <span className="text-amber-400 font-bold">Cod:</span>
                    <span>{team.inviteCode}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-purple-400" />}
                  </button>
                )}

                <div 
                  onClick={() => onNavigate("team")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 cursor-pointer hover:bg-amber-500/20 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-purple-600 flex items-center justify-center text-xs shadow">
                    {user.avatar || (user.role === "TEAM_LEADER" ? "👑" : "👤")}
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-amber-300">
                    {user.name.split(" ")[0]}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-purple-400 hover:text-red-400 hover:bg-purple-900/30 transition-colors"
                  title="Deconectare"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                onClick={() => setIsAuthOpen(true)}
                className="gold-btn rounded-full text-xs font-heading tracking-wider px-4 py-1.5 h-8 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                AUTENTIFICARE
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-full bg-purple-900/60 border border-purple-700/50 text-purple-200 flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </header>

        {/* Mobile Flyout Menu */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto max-w-sm mx-auto mt-2 rounded-2xl border border-purple-700/50 bg-[#0f041e]/95 backdrop-blur-2xl p-3 space-y-1 shadow-2xl animate-in slide-in-from-top-3 duration-200">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    onNavigate(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left ${
                    isActive 
                      ? "bg-amber-400 text-purple-950 font-bold" 
                      : "text-purple-200 hover:bg-purple-900/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
