import { t, useLanguage } from "@/lib/i18n";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, useScroll, useSpring, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  X,
} from "lucide-react";
import AuthModal from "./AuthModal";

// ─── Nav link order must match the actual page section order ───────────────
const NAV_LINKS = [
  { id: "hero",         label: "Eveniment",       icon: Sparkles  },
  { id: "registration", label: "Înscrieri",        icon: Users     },
  { id: "games",        label: "Jocuri",           icon: Gamepad2  },
  { id: "rulebook",     label: "Regulament",       icon: BookOpen  },
  { id: "team",         label: "Echipa Mea",       icon: Crown     },
  { id: "prizes",       label: "Premii & Locație", icon: Crown     },
];

interface NavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  editionLabel?: string;
}

export default function Navbar({
  activeSection,
  onNavigate,
  editionLabel = t("Marți 20:00"),
}: NavbarProps) {
  const { user, team, logout } = useAuth();
  const { toast } = useToast();
  const language = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [, setLocation]                     = useLocation();
  const [isAuthOpen, setIsAuthOpen]         = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pillReady, setPillReady] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const navRef       = useRef<HTMLElement>(null);
  const buttonRefs   = useRef<(HTMLButtonElement | null)[]>([]);
  // Overlay span for each button — dark-colored duplicate, clipped to pill area
  const overlayRefs  = useRef<(HTMLSpanElement | null)[]>([]);

  const cachedRects  = useRef<Array<{ left: number; width: number }>>([]);
  const cachedTops   = useRef<number[]>([]);

  // ─── Motion values ─────────────────────────────────────────────────────────
  const pillLeft  = useSpring(0, { stiffness: 320, damping: 38 });
  const pillWidth = useSpring(0, { stiffness: 320, damping: 38 });

  const { scrollY } = useScroll();

  // ─── Cache button bounding rects ───────────────────────────────────────────
  const cacheButtonRects = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl || navEl.getClientRects().length === 0) return false;
    const navRect = navEl.getBoundingClientRect();

    cachedRects.current = buttonRefs.current.map((btn) => {
      if (!btn) return { left: 0, width: 0 };
      const r = btn.getBoundingClientRect();
      return { left: r.left - navRect.left - navEl.clientLeft, width: r.width };
    });
    return cachedRects.current.every(({ width }) => width > 0);
  }, []);

  // ─── Cache section top offsets ─────────────────────────────────────────────
  const cacheSectionTops = useCallback(() => {
    cachedTops.current = NAV_LINKS.map(({ id }) => {
      const el = document.getElementById(id);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    });
  }, []);

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthOpen(true);
    window.addEventListener("open-auth-modal", handleOpenAuth);
    return () => window.removeEventListener("open-auth-modal", handleOpenAuth);
  }, []);

  // ─── Per-character clip: update each overlay's clip-path every spring tick ─
  // For each button, the dark overlay is clipped to only the region where the
  // spring pill overlaps that button — creating a per-pixel color reveal.
  const applyClipPaths = useCallback(() => {
    const pLeft = pillLeft.get();
    const pWidth = pillWidth.get();
    const pRight = pLeft + pWidth;

    overlayRefs.current.forEach((overlay, i) => {
      if (!overlay) return;
      const rect = cachedRects.current[i];
      if (!rect) return;

      const bLeft  = rect.left;
      const bWidth = rect.width;
      const bRight = bLeft + bWidth;

      // Intersection in button-local coordinates
      const iLeft  = Math.max(pLeft, bLeft)  - bLeft; // pixels from button left
      const iRight = Math.min(pRight, bRight) - bLeft; // pixels from button left

      if (iLeft >= iRight) {
        // No overlap — fully hide the dark overlay
        overlay.style.clipPath = "inset(0 100% 0 0)";
      } else {
        // Partial or full overlap — clip to the pill's footprint on this button
        const leftClip  = iLeft;
        const rightClip = bWidth - iRight;
        overlay.style.clipPath = `inset(0 ${rightClip}px 0 ${leftClip}px)`;
      }
    });
  }, [pillLeft, pillWidth]);

  // Drive clip-paths from the spring value on every animation frame
  useMotionValueEvent(pillLeft, "change", applyClipPaths);
  useMotionValueEvent(pillWidth, "change", applyClipPaths);

  const updatePillPosition = useCallback((y: number, snap = false) => {
    const tops  = cachedTops.current;
    const rects = cachedRects.current;
    if (!tops.length || !rects.length) return;

    const OFFSET = 100;
    const vh     = window.innerHeight;
    let navIndex = tops.length - 1;

    for (let i = 0; i < tops.length - 1; i++) {
      const currentTop = tops[i]     - OFFSET;
      const nextTop    = tops[i + 1] - OFFSET;
      const transitionStart = Math.max(0, currentTop, nextTop - vh);
      const transitionEnd   = nextTop;

      if (y <= transitionStart) {
        navIndex = i;
        break;
      } else if (y < transitionEnd) {
        const t = (y - transitionStart) / (transitionEnd - transitionStart);
        navIndex = i + Math.min(Math.max(t, 0), 1);
        break;
      }
    }

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScroll > 0 && y >= maxScroll - 5) {
      navIndex = tops.length - 1;
    }

    const lower = Math.floor(navIndex);
    const upper = Math.min(lower + 1, rects.length - 1);
    const t     = navIndex - lower;

    const lo = rects[lower] ?? rects[0];
    const hi = rects[upper] ?? rects[rects.length - 1];

    const left = lo.left + (hi.left - lo.left) * t;
    const width = lo.width + (hi.width - lo.width) * t;
    if (snap || shouldReduceMotion) {
      // Jump the visible springs themselves: changing only their targets still
      // animates from the initial width and briefly splits the first label.
      pillLeft.jump(left);
      pillWidth.jump(width);
      applyClipPaths();
    } else {
      pillLeft.set(left);
      pillWidth.set(width);
    }
  }, [pillLeft, pillWidth, shouldReduceMotion, applyClipPaths]);

  // ─── Mount + resize ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const hasVisibleButtons = cacheButtonRects();
      cacheSectionTops();
      if (hasVisibleButtons) {
        updatePillPosition(window.scrollY, true);
      }
      setPillReady(hasVisibleButtons);
    };

    // Measure before the first paint; fonts and translated labels can change
    // button widths without changing the body's dimensions.
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    if (navRef.current) resizeObserver.observe(navRef.current);
    buttonRefs.current.forEach((button) => {
      if (button) resizeObserver.observe(button);
    });
    NAV_LINKS.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) resizeObserver.observe(section);
    });

    void document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
    window.addEventListener("resize", measure);
    return () => {
      disposed = true;
      resizeObserver.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
      window.removeEventListener("resize", measure);
    };
  }, [language, cacheButtonRects, cacheSectionTops, updatePillPosition]);

  // ─── Drive pill position from scroll ──────────────────────────────────────
  useMotionValueEvent(scrollY, "change", updatePillPosition);

  // ─── Invite-code copy ─────────────────────────────────────────────────────
  const copyInviteCode = async () => {
    if (team?.inviteCode) {
      try {
        await navigator.clipboard.writeText(team.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({ title: t("Eroare"), description: t("Nu am putut copia. Selectează și copiază manual codul."), variant: "destructive" });
      }
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none">
        <header className="pointer-events-auto w-fit mx-auto mt-3 sm:mt-5 rounded-full p-1.5 sm:p-2 bg-[#0c0317]/85 backdrop-blur-2xl ring-1 ring-amber-400/30 shadow-[0_15px_40px_rgba(0,0,0,0.85)] flex items-center gap-3 transition-all duration-300">

          {/* Brand Mark */}
          <button
            type="button"
            onClick={() => onNavigate("hero")}
            className="flex items-center gap-2.5 pl-2 sm:pl-3 text-left group flex-shrink-0"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden p-0.5 ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(246,184,40,0.3)] group-hover:scale-105 transition-transform">
              <img src="/logo-main.webp" width={880} height={880} alt="Transilvania Trivia" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg sm:text-xl text-gold-gradient tracking-widest leading-none drop-shadow">
                TRANSILVANIA TRIVIA
              </span>
              <span className="text-[10px] text-purple-300/80 font-medium tracking-wide flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping motion-reduce:animate-none" />
                {editionLabel}
              </span>
            </div>
          </button>

          {/* ── Desktop Nav with sliding pill + per-pixel clip-path reveal ── */}
          <nav
            ref={navRef}
            aria-label={t("Navigare principală")}
            className="hidden lg:flex items-center gap-1 bg-purple-950/40 p-1 rounded-full border border-purple-800/40 relative"
          >
            {/* The amber sliding background pill */}
            <motion.div
              className="absolute inset-y-1 rounded-full bg-amber-400 shadow-[0_0_15px_rgba(246,184,40,0.45)] pointer-events-none"
              aria-hidden="true"
              style={{ left: pillLeft, width: pillWidth, visibility: pillReady ? "visible" : "hidden" }}
            />

            {NAV_LINKS.map((link, i) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  ref={(el) => { buttonRefs.current[i] = el; }}
                  onClick={() => onNavigate(link.id)}
                  aria-current={activeSection === link.id ? "location" : undefined}
                  className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
                >
                  {/* Base layer — always light/purple (visible in un-highlighted areas) */}
                  <Icon className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
                  <span className="text-purple-200/80">{t(link.label)}</span>

                  {/* Overlay layer — dark color, clipped to where the pill overlaps.
                      clip-path is updated on every spring frame by applyClipPaths(). */}
                  <span
                    ref={(el) => { overlayRefs.current[i] = el; }}
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center gap-1.5 px-3 text-xs font-medium text-purple-950 pointer-events-none overflow-hidden rounded-full"
                    style={{ clipPath: "inset(0 100% 0 0)" }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-purple-950" />
                    <span>{t(link.label)}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right User / Auth Status (Desktop Only) */}
          <div className="flex items-center gap-1 sm:gap-2 pr-1 sm:pr-2">
            {user ? (
              <div className="hidden lg:flex items-center gap-1.5">
                {team && (
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/50 border border-purple-600/40 hover:border-amber-400/60 text-[11px] font-mono transition-colors text-purple-200"
                    title={t("Copiază codul de invitație pentru coechipieri")}
                  >
                    <span className="text-amber-400 font-bold">{t("Cod:")}</span>
                    <span>{team.inviteCode}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-purple-400" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLocation("/cont")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 cursor-pointer hover:bg-amber-500/20 transition-all"
                  title={t("Contul Meu")}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-purple-600 flex items-center justify-center text-xs shadow">
                    {user.avatar || (user.role === "TEAM_LEADER" ? "👑" : "👤")}
                  </div>
                  <span className="text-xs font-bold text-amber-300">
                    {user.name.split(" ")[0]}
                  </span>
                </button>
                <button
                  onClick={logout}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-purple-400 hover:text-red-400 hover:bg-purple-900/30 transition-colors"
                  title={t("Deconectare")}
                  aria-label={t("Deconectare")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                onClick={() => setIsAuthOpen(true)}
                className="hidden lg:flex gold-btn rounded-full text-xs font-heading tracking-wider px-4 py-1.5 h-8 items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                 {t("AUTENTIFICARE")} </Button>
            )}

            {/* Mobile Menu Toggle (Always visible on mobile) */}
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={t(mobileMenuOpen ? "Închide meniul" : "Deschide meniul")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-900/60 border border-purple-700/50 text-purple-200 flex items-center justify-center shrink-0 hover:bg-purple-800/60 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </header>

        {/* Mobile Flyout Menu */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="lg:hidden pointer-events-auto max-w-sm mx-auto mt-2 rounded-3xl border border-purple-700/50 bg-[#0f041e]/95 backdrop-blur-2xl p-4 shadow-2xl animate-in slide-in-from-top-3 duration-200 motion-reduce:animate-none">

            {/* Mobile Auth / Profile Section */}
            {user ? (
              <div className="flex flex-col gap-3 p-3 bg-purple-950/40 border border-purple-800/50 rounded-2xl mb-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLocation("/cont");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-purple-600 flex items-center justify-center text-lg shadow-inner ring-1 ring-amber-400/30">
                      {user.avatar || (user.role === "TEAM_LEADER" ? "👑" : "👤")}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white leading-tight">{user.name}</div>
                      <div className="text-[10px] text-amber-300 uppercase tracking-widest font-semibold mt-0.5">{user.role === "TEAM_LEADER" ? t("Căpitan") : t("Membru")}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-2.5 rounded-xl text-purple-400 hover:text-red-400 bg-purple-900/40 border border-purple-700/40 transition-colors shadow-sm"
                    aria-label={t("Deconectare")}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
                {team && (
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/40 border border-purple-700/40 hover:border-amber-400/50 transition-all text-xs w-full text-left"
                  >
                    <span className="text-purple-300">{t("Cod echipă:")} <span className="font-mono text-amber-400 font-bold ml-1.5 tracking-wider">{team.inviteCode}</span></span>
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-purple-400" />}
                  </button>
                )}
              </div>
            ) : (
              <Button
                onClick={() => {
                  setIsAuthOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full gold-btn rounded-xl py-6 text-sm font-heading tracking-widest flex items-center justify-center gap-2.5 mb-4 shadow-[0_0_20px_rgba(246,184,40,0.15)]"
              >
                <LogIn className="w-4 h-4" />
                 {t("AUTENTIFICARE")} </Button>
            )}

            {/* Navigation Links */}
            <nav className="space-y-1" aria-label={t("Navigare principală")}>
              {NAV_LINKS.map((link) => {
                const Icon     = link.icon;
                const isActive = activeSection === link.id;
                return (
                  <button
                    key={link.id}
                    aria-current={isActive ? "location" : undefined}
                    onClick={() => {
                      onNavigate(link.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium text-left transition-colors ${
                      isActive
                        ? "bg-amber-400 text-purple-950 font-bold"
                        : "text-purple-200 hover:bg-purple-900/40"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t(link.label)}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
