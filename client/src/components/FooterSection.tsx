import { Sparkles, Heart, Wine, MapPin } from "lucide-react";

export default function FooterSection() {
  return (
    <footer className="border-t border-purple-900/40 bg-[#06010b] text-foreground py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Brand Column */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden p-0.5 ring-1 ring-amber-400/40 shadow">
            <img src="/logo-main.png" alt="Transilvania Trivia" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-heading text-2xl text-gold-gradient tracking-widest leading-none">
              TRANSILVANIA TRIVIA
            </div>
            <div className="text-xs text-purple-300/70 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Insomnia Restaurant • Str. Universității nr. 2, Cluj-Napoca
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-6 text-xs text-purple-200/80 font-medium">
          <a href="#hero" className="hover:text-amber-300 transition-colors">Eveniment</a>
          <a href="#registration" className="hover:text-amber-300 transition-colors">Înscrieri</a>
          <a href="#games" className="hover:text-amber-300 transition-colors">Mini-Jocuri</a>
          <a href="#rulebook" className="hover:text-amber-300 transition-colors">Regulament</a>
          <a href="#prizes" className="hover:text-amber-300 transition-colors">Premii</a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-purple-400/60 text-center md:text-right">
          <div>© {new Date().getFullYear()} Transilvania Trivia. Toate drepturile rezervate.</div>
          <div className="text-[11px] text-purple-400/40 mt-1">
            Creat cu pasiune pentru cultura și misterele Transilvaniei.
          </div>
        </div>

      </div>
    </footer>
  );
}
