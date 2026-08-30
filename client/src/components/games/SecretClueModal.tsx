import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Scroll, Crown, ShieldCheck, Flame } from "lucide-react";

interface SecretClueModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretClue: string;
  theme: string;
  editionNumber: number;
}

export default function SecretClueModal({
  isOpen,
  onClose,
  secretClue,
  theme,
  editionNumber,
}: SecretClueModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] bg-[#0e041d] border-2 border-amber-400 text-foreground p-6 shadow-[0_0_80px_rgba(246,184,40,0.4)]">
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-purple-600 border-2 border-amber-300 flex items-center justify-center shadow-[0_0_30px_rgba(246,184,40,0.6)] animate-pulse">
              <Crown className="w-8 h-8 text-purple-950" />
            </div>
          </div>
          <DialogTitle className="text-3xl font-heading tracking-widest text-gold-gradient">
            PERGAMENTUL SECRET AL EDIȚIEI #{editionNumber}
          </DialogTitle>
          <DialogDescription className="text-amber-300/80 text-xs">
            Toate cele 6 mini-jocuri au fost completate de echipa ta!
          </DialogDescription>
        </DialogHeader>

        {/* Ancient Parchment Style Box */}
        <div className="relative my-4 p-6 rounded-2xl bg-gradient-to-b from-[#2a1740] via-[#1e0d33] to-[#140624] border border-amber-400/50 shadow-inner text-left">
          
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="text-xs uppercase tracking-wider font-bold text-amber-300">
              Tema Ediției: {theme}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-purple-950/80 border border-purple-700/50 mb-4">
            <div className="font-heading text-lg text-amber-400 flex items-center gap-2 mb-1">
              <Scroll className="w-5 h-5 text-amber-400" />
              Misterul & Indiciul Secret:
            </div>
            <p className="text-sm text-purple-100 italic leading-relaxed">
              "{secretClue}"
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Avantaj Strategic:</strong> Acest indiciu se va regăsi într-o întrebare din Runda Tematică sau Final Gamble marțea aceasta!
            </span>
          </div>
        </div>

        <Button onClick={onClose} className="w-full gold-btn py-5 font-heading text-base tracking-widest">
          MULȚUMESC, AM MEMORAT INDICIUL!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
