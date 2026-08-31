import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Scroll, 
  Crown, 
  ShieldCheck, 
  Flame, 
  Lock, 
  Unlock, 
  KeyRound, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface SecretClueModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretClue: string;
  theme: string;
  editionNumber: number;
  solvedCount: number;
  totalGames: number;
  isUnlocked: boolean;
}

export default function SecretClueModal({
  isOpen,
  onClose,
  secretClue,
  theme,
  editionNumber,
  solvedCount,
  totalGames = 6,
  isUnlocked,
}: SecretClueModalProps) {
  const remaining = totalGames - solvedCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] bg-[#0c0317] border-2 border-amber-400/80 text-foreground p-6 sm:p-8 rounded-[2.5rem] shadow-[0_0_80px_rgba(246,184,40,0.35)]">
        
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center shadow-lg transition-all ${
              isUnlocked
                ? "bg-gradient-to-tr from-amber-400 to-amber-600 border-amber-300 text-purple-950 shadow-[0_0_30px_rgba(246,184,40,0.6)] animate-pulse"
                : "bg-purple-950/80 border-purple-600/40 text-purple-400"
            }`}>
              {isUnlocked ? <Unlock className="w-8 h-8 text-purple-950" /> : <Lock className="w-8 h-8 text-purple-300" />}
            </div>
          </div>

          <Badge className={`mx-auto mb-2 text-xs font-bold uppercase tracking-wider px-3 py-1 ${
            isUnlocked ? "bg-amber-400 text-purple-950" : "bg-purple-900/60 text-purple-200 border-purple-600/40"
          }`}>
            {isUnlocked ? "SIGILIUL ESTE RUPT" : `SIGILIU DE CEARĂ BLOCAT (${solvedCount}/${totalGames})`}
          </Badge>

          <DialogTitle className="text-2xl sm:text-3xl font-heading tracking-widest text-gold-gradient">
            {isUnlocked ? `PERGAMENTUL SECRET • EDIȚIA #${editionNumber}` : `MISTERUL ESTE ÎNCĂ PECETLUIT`}
          </DialogTitle>
          <DialogDescription className="text-purple-300/80 text-xs sm:text-sm">
            {isUnlocked
              ? "Felicitări! Echipa ta a descifrat toate cele 6 puzzle-uri săptămânale."
              : `Mai aveți de rezolvat ${remaining} puzzle-${remaining === 1 ? 'ul rămas' : 'uri rămase'} pentru a obține indiciul oficial.`}
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Content: Locked Vault vs Unlocked Lore Card */}
        {isUnlocked ? (
          <div className="relative my-4 p-6 rounded-2xl bg-gradient-to-b from-[#2a1740] via-[#1b0a2e] to-[#120520] border border-amber-400/60 shadow-inner text-left animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-bold text-amber-300">
                Tema Oficială: {theme}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-purple-950/90 border border-amber-400/40 mb-4 shadow-lg">
              <div className="font-heading text-lg text-amber-400 flex items-center gap-2 mb-2">
                <Scroll className="w-5 h-5 text-amber-400" />
                Indiciul Secret al Ediției:
              </div>
              <p className="text-base text-purple-50 italic leading-relaxed font-serif font-medium">
                "{secretClue}"
              </p>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Avantaj Strategic de Concurs:</strong> Acest indiciu se va regăsi garantat într-o întrebare din Runda Tematică sau din Final Gamble marți seară la Insomnia!
              </span>
            </div>
          </div>
        ) : (
          <div className="relative my-4 p-6 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-center space-y-4">
            
            {/* Redacted Clue Preview Box */}
            <div className="p-5 rounded-xl bg-purple-950/80 border border-purple-700/40 relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Conținut Criptat de Quizmaster
              </div>
              
              {/* Blur / Redacted placeholders */}
              <div className="space-y-2 select-none filter blur-sm opacity-50 py-2">
                <div className="h-4 bg-purple-600/40 rounded w-full" />
                <div className="h-4 bg-amber-500/40 rounded w-5/6 mx-auto" />
                <div className="h-4 bg-purple-600/40 rounded w-4/6 mx-auto" />
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <span className="font-mono text-xs font-bold text-amber-300">
                  🔒 ACCES INTERZIS FĂRĂ CELE 6 CHEI
                </span>
                <span className="text-[11px] text-purple-300 mt-1">
                  Progres actual: <strong>{solvedCount} / {totalGames} jocuri rezolvate</strong>
                </span>
              </div>
            </div>

            <div className="text-xs text-purple-300/80 max-w-sm mx-auto leading-relaxed">
              Colaborează cu coechipierii tăi pentru a finaliza Wordle, Sudoku, Cronologia evenimentelor istorice, Conexiunile și Ghicește Țara!
            </div>
          </div>
        )}

        <Button
          onClick={onClose}
          className={isUnlocked ? "w-full gold-btn py-5 font-heading text-base tracking-widest" : "w-full purple-btn py-4 font-heading text-sm tracking-wider"}
        >
          {isUnlocked ? "AM REȚINUT SECRETUL" : "ÎNAPOI LA MINI-JOCURI"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
