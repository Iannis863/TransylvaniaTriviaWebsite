import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useScroll, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
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
  editionLabel = "Marți 20:00",
}: NavbarProps) {
  const { user, team, logout } = useAuth();
  const [isAuthOpen, setIsAuthOpen]         = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const navRef       = useRef<HTMLElement>(null);
  const buttonRefs   = useRef<(HTMLButtonElement | null)[]>([]);
  // Overlay span for each button — dark-colored duplicate, clipped to pill area
  const overlayRefs  = useRef<(HTMLSpanElement | null)[]>([]);

  const cachedRects  = useRef<Array<{ left: number; width: number }>>([]);
  const cachedTops   = useRef<number[]>([]);

  // ─── Motion values ─────────────────────────────────────────────────────────
  const rawLeft  = useMotionValue(0);
  const rawWidth = useMotionValue(80);
  // Spring-smoothed values — these are what the visible pill follows
  const pillLeft  = useSpring(rawLeft,  { stiffness: 320, damping: 38 });
  const pillWidth = useSpring(rawWidth, { stiffness: 320, damping: 38 });

  const { scrollY } = useScroll();

  // ─── Cache button bounding rects ───────────────────────────────────────────
  const cacheButtonRects = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    cachedRects.current = buttonRefs.current.map((btn) => {
      if (!btn) return { left: 0, width: 80 };
      const r = btn.getBoundingClientRect();
      return { left: r.left - navRect.left, width: r.width };
    });
  }, []);

  // ─── Cache section top offsets ─────────────────────────────────────────────
  const cacheSectionTops = useCallback(() => {
    cachedTops.current = NAV_LINKS.map(({ id }) => {
      const el = document.getElementById(id);
      return el ? el.offsetTop : 0;
    });
  }, []);

  // ─── Per-character clip: update each overlay's clip-path every spring tick ─
  // For each button, the dark overlay is clipped to only the region where the
  // spring pill overlaps that button — creating a per-pixel color reveal.
  const applyClipPaths = useCallback((pLeft: number) => {
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
  }, [pillWidth]);

  // Drive clip-paths from the spring value on every animation frame
  useMotionValueEvent(pillLeft, "change", applyClipPaths);

  // ─── Mount + resize ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = () => {
      cacheButtonRects();
      cacheSectionTops();

      // Snap pill to initial section
      const idx = NAV_LINKS.findIndex((l) => l.id === activeSection);
      if (idx >= 0 && cachedRects.current[idx]) {
        rawLeft.jump(cachedRects.current[idx].left);
        rawWidth.jump(cachedRects.current[idx].width);
        // Apply initial clip-paths immediately
        applyClipPaths(cachedRects.current[idx].left);
      }
    };

    const t = setTimeout(init, 120);
    window.addEventListener("resize", cacheButtonRects);
    window.addEventListener("resize", cacheSectionTops);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", cacheButtonRects);
      window.removeEventListener("resize", cacheSectionTops);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drive pill position from scroll ──────────────────────────────────────
  useMotionValueEvent(scrollY, "change", (y) => {
    const tops  = cachedTops.current;
    const rects = cachedRects.current;
    if (!tops.length || !rects.length) return;

    const OFFSET = 100;
    let navIndex = 0;

    for (let i = 0; i < tops.length; i++) {
      const top  = tops[i]  - OFFSET;
      const next = (tops[i + 1] ?? Infinity) - OFFSET;

      if (y >= top && y < next) {
        const sectionHeight = next === Infinity ? 800 : next - top;
        navIndex = i + Math.min(Math.max((y - top) / sectionHeight, 0), 0.999);
        break;
      }
      if (i === tops.length - 1 && y >= top) navIndex = i;
    }

    const lower = Math.floor(navIndex);
    const upper = Math.min(lower + 1, rects.length - 1);
    const t     = navIndex - lower;

    const lo = rects[lower] ?? rects[0];
    const hi = rects[upper] ?? rects[rects.length - 1];

    rawLeft.set(lo.left  + (hi.left  - lo.left)  * t);
    rawWidth.set(lo.width + (hi.width - lo.width) * t);
  });

  // ─── Invite-code copy ─────────────────────────────────────────────────────
  const copyInviteCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none">
        <header className="pointer-events-auto w-fit mx-auto mt-3 sm:mt-5 rounded-full p-1.5 sm:p-2 bg-[#0c0317]/85 backdrop-blur-2xl ring-1 ring-amber-400/30 shadow-[0_15px_40px_rgba(0,0,0,0.85)] flex items-center gap-3 transition-all duration-300">

          {/* Brand Mark */}
          <div
            onClick={() => onNavigate("hero")}
            className="flex items-center gap-2.5 pl-2 sm:pl-3 cursor-pointer group flex-shrink-0"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden p-0.5 ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(246,184,40,0.3)] group-hover:scale-105 transition-transform">
              <img src="/logo-main.png" alt="Transilvania Trivia" className="w-full h-full object-cover rounded-full" />
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

          {/* ── Desktop Nav with sliding pill + per-pixel clip-path reveal ── */}
          <nav
            ref={navRef}
            className="hidden lg:flex items-center gap-1 bg-purple-950/40 p-1 rounded-full border border-purple-800/40 relative"
          >
            {/* The amber sliding background pill */}
            <motion.div
              className="absolute inset-y-1 rounded-full bg-amber-400 shadow-[0_0_15px_rgba(246,184,40,0.45)] pointer-events-none"
              style={{ left: pillLeft, width: pillWidth }}
            />

            {NAV_LINKS.map((link, i) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  ref={(el) => { buttonRefs.current[i] = el; }}
                  onClick={() => onNavigate(link.id)}
                  className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                >
                  {/* Base layer — always light/purple (visible in un-highlighted areas) */}
                  <Icon className="w-3.5 h-3.5 text-amber-400/80" />
                  <span className="text-purple-200/80">{link.label}</span>

                  {/* Overlay layer — dark color, clipped to where the pill overlaps.
                      clip-path is updated on every spring frame by applyClipPaths(). */}
                  <span
                    ref={(el) => { overlayRefs.current[i] = el; }}
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center gap-1.5 px-3 text-xs font-bold text-purple-950 pointer-events-none overflow-hidden rounded-full"
                    style={{ clipPath: "inset(0 100% 0 0)" }}
                  >
                    <Icon className="w-3.5 h-3.5 text-purple-950" />
                    {link.label}
                  </span>
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
            {NAV_LINKS.map((link) => {
              const Icon     = link.icon;
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
