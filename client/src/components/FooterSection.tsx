import { Sparkles, Heart, Instagram, Facebook, ShieldCheck } from "lucide-react";

export default function FooterSection() {
  return (
    <footer className="border-t border-purple-900/40 bg-[#07020d] text-foreground py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/logo-main.png" alt="Transilvania Trivia" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-heading text-xl text-gold-gradient tracking-wider">TRANSILVANIA TRIVIA</div>
            <div className="text-[11px] text-purple-300/70">Quiz Night la Insomnia Restaurant • Cluj-Napoca</div>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-xs text-purple-300/80">
          <a href="#hero" className="hover:text-amber-300 transition-colors">Înscrieri</a>
          <a href="#games" className="hover:text-amber-300 transition-colors">Mini-Jocuri</a>
          <a href="#rulebook" className="hover:text-amber-300 transition-colors">Regulament</a>
          <a href="#prizes" className="hover:text-amber-300 transition-colors">Premii</a>
          <a href="/admin" className="hover:text-amber-300 transition-colors">Admin</a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-purple-300/60 text-center md:text-right">
          <div>© {new Date().getFullYear()} Transilvania Trivia. Toate drepturile rezervate.</div>
          <div className="text-[10px] text-purple-400/50 mt-0.5">Creat pentru pasionații de cultură, mister și competiție.</div>
        </div>

      </div>
    </footer>
  );
}
