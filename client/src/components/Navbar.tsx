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
  ShieldAlert,
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
    { id: "hero", label: "Eveniment & Înscriere", icon: Sparkles },
    { id: "games", label: "Jocuri Săptămânale", icon: Gamepad2 },
    { id: "rulebook", label: "Regulament & Teme", icon: BookOpen },
    { id: "prizes", label: "Premii & Locație", icon: Crown },
    { id: "team", label: "Echipa Mea", icon: Users },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-purple-500/20 bg-[#0c0418]/85 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Live Badge */}
          <div 
            onClick={() => onNavigate("hero")}
            className="flex items-center gap-3.5 cursor-pointer group flex-shrink-0"
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden p-0.5 border border-amber-400/40 shadow-[0_0_15px_rgba(246,184,40,0.35)] group-hover:scale-105 transition-transform">
              <img 
                src="/logo-main.png" 
                alt="Transilvania Trivia" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-xl sm:text-2xl text-gold-gradient tracking-widest leading-none drop-shadow">
                TRANSILVANIA TRIVIA
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-purple-300/80 font-medium tracking-wide">
                  {editionLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? "bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-[0_0_15px_rgba(246,184,40,0.2)]" 
                      : "text-purple-200/80 hover:text-white hover:bg-purple-900/30"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-purple-400"}`} />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action / Auth Area */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                {team && (
                  <button
                    onClick={copyInviteCode}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-950/70 border border-purple-600/40 hover:border-amber-400/60 text-xs font-mono transition-colors group text-purple-200"
                    title="Copiază codul de invitație pentru coechipieri"
                  >
                    <span className="text-amber-400">Cod:</span>
                    <span className="font-bold">{team.inviteCode}</span>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400 group-hover:text-amber-300" />}
                  </button>
                )}

                <div 
                  onClick={() => onNavigate("team")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/30 cursor-pointer hover:bg-amber-500/20 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-purple-600 flex items-center justify-center text-sm shadow">
                    {user.avatar || (user.role === "TEAM_LEADER" ? "👑" : "👤")}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-bold text-amber-300 leading-tight">
                      {user.name.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-purple-300/70">
                      {user.role === "TEAM_LEADER" ? "Căpitan" : "Membru"}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={logout}
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-purple-400 hover:text-red-400 hover:bg-purple-900/30"
                  title="Deconectare"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setIsAuthOpen(true)}
                className="gold-btn text-xs sm:text-sm font-heading tracking-wider flex items-center gap-2 px-4 py-2"
              >
                <LogIn className="w-4 h-4" />
                AUTENTIFICARE
              </Button>
            )}

            {/* Admin Link */}
            <a
              href="/admin"
              className="hidden xl:flex items-center gap-1 text-[11px] text-purple-400/70 hover:text-amber-300 transition-colors ml-1"
              title="Panou Admin"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin
            </a>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-purple-950/60 border border-purple-700/50 text-purple-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-purple-800/40 bg-[#0f051e] px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200">
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
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-left ${
                    isActive 
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" 
                      : "text-purple-200 hover:bg-purple-900/30"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-purple-400"}`} />
                  {link.label}
                </button>
              );
            })}
            <a
              href="/admin"
              className="flex items-center gap-3 px-4 py-2 text-xs text-purple-400 hover:text-amber-300"
            >
              <ShieldAlert className="w-4 h-4" />
              Panou Administrator
            </a>
          </div>
        )}
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
