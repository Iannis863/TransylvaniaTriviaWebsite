import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Send, 
  Crown, 
  Flame,
  ShieldAlert,
  SearchCheck,
  Brain,
  Gauge
} from "lucide-react";

interface ValidationResult {
  themeName: string;
  popularityScore: number;
  isEligible: boolean;
  status: "APPROVED" | "BORDERLINE" | "REJECTED";
  category: string;
  feedback: string;
  difficultyRating: string;
  suggestedQuestions: string[];
}

export default function ThemeValidator() {
  const { user, team } = useAuth();
  const { toast } = useToast();
  const [themeInput, setThemeInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValidateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeInput.trim()) return;

    setIsValidating(true);
    setResult(null);

    try {
      const res = await fetch("/api/theme-validator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: themeInput,
        }),
      });

      if (!res.ok) throw new Error("Eroare la validare");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut analiza tema. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleProposeTheme = async () => {
    if (!result) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/theme-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeName: result.themeName,
          description: "Generat automat fără sub-teme",
          popularityScore: result.popularityScore,
          teamId: team?.id || null,
          proposedBy: user?.name || "Echipă Participantă",
        }),
      });

      if (res.ok) {
        toast({
          title: "🎉 Propunere Trimisă!",
          description: `Tema "${result.themeName}" a fost transmisă către Quizmaster pentru evaluare finală.`,
        });
        setThemeInput("");
        setResult(null);
      }
    } catch (err) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite propunerea",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-2xl">
      <div className="p-6 sm:p-10 rounded-[calc(2.5rem-0.5rem)] bg-[#0e041d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
        
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-purple-800/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                Privilegiul Echipei de pe Ultimul Loc
              </div>
              <h3 className="text-2xl font-heading text-white tracking-wider">
                VALIDATOR ALGORITMIC DE TEME
              </h3>
              <p className="text-xs text-purple-300/80">
                Echipa clasată pe ultimul loc la ediția precedentă are dreptul să aleagă tema rundei următoare.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleValidateTheme} className="space-y-4 my-6">
          <div>
            <label className="text-xs font-bold text-purple-200 uppercase tracking-wider block mb-1.5">
              Tema Propusă *
            </label>
            <Input
              placeholder="Ex: Mitologia Nordică, Fizică Cuantică, Filme Tarantino..."
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
              className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm h-12 rounded-xl text-white placeholder:text-purple-400/60"
            />
          </div>

          <Button
            type="submit"
            disabled={isValidating || !themeInput.trim()}
            className="w-full gold-btn rounded-full py-6 font-heading tracking-widest text-base shadow-[0_0_25px_rgba(246,184,40,0.3)] flex items-center justify-center gap-2"
          >
            <SearchCheck className="w-5 h-5" />
            <span>{isValidating ? "SE ANALIZEAZĂ POPULARITATEA..." : "TESTEAZĂ ELIGIBILITATEA TEMEI"}</span>
          </Button>
        </form>

        {/* Validation Telemetry Result */}
        {result && (
          <div className="mt-8 p-6 rounded-2xl bg-purple-950/40 border border-purple-700/60 animate-in fade-in-50 duration-300">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-5 border-b border-purple-800/50">
              <div className="text-left">
                <Badge className={result.isEligible ? "bg-emerald-500 text-purple-950 font-bold mb-1" : "bg-red-500 text-white font-bold mb-1"}>
                  {result.isEligible ? "TEMĂ ELIGIBILĂ PENTRU CONCURS" : "TEMĂ LIMITATĂ"}
                </Badge>
                <h4 className="text-2xl font-heading text-gold-gradient tracking-wide">
                  {result.themeName}
                </h4>
                <div className="text-xs text-purple-300 mt-1">
                  Categorie Detectată: <strong className="text-amber-300">{result.category}</strong> • Dificultate estimată: <strong className="text-purple-200">{result.difficultyRating}</strong>
                </div>
              </div>

              {/* Concentric Circular Gauge Score */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 p-0.5 shadow-[0_0_20px_rgba(246,184,40,0.4)]">
                  <div className="w-full h-full rounded-full bg-[#0d041a] flex flex-col items-center justify-center">
                    <span className="font-heading text-xl text-amber-400 font-bold">{result.popularityScore}</span>
                    <span className="text-[8px] text-purple-300 tracking-tighter">SCOR / 100</span>
                  </div>
                </div>
                <div className="text-left text-xs">
                  <div className="text-purple-300 font-bold uppercase">Index Fezabilitate</div>
                  <div className="text-purple-400/80 text-[11px]">Bază largă de cunoștințe</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-950/60 border border-purple-800/40 my-4 text-xs text-purple-200 leading-relaxed text-left">
              <strong>Evaluare Quizmaster AI:</strong> {result.feedback}
            </div>

            {/* Score Legend */}
            <div className="text-left my-4">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Ce înseamnă scorul?
              </div>
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-lg bg-[#140626] border border-red-500/30 text-xs text-purple-100 flex items-start gap-2">
                  <span className="text-red-400 font-bold font-mono shrink-0 w-8">&lt; 40</span>
                  <span>Tema este foarte probabil <strong>neeligibilă</strong> (prea obscură, prea tehnică sau nevalidă).</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#140626] border border-amber-500/30 text-xs text-purple-100 flex items-start gap-2">
                  <span className="text-amber-400 font-bold font-mono shrink-0 w-8">40-60</span>
                  <span>Tema este <strong>la limită</strong> și trebuie validată manual de către Quizmaster.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#140626] border border-emerald-500/30 text-xs text-purple-100 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold font-mono shrink-0 w-8">&gt; 60</span>
                  <span>Tema este foarte probabil <strong>eligibilă</strong> și pregătită pentru concurs!</span>
                </div>
              </div>
            </div>

            {/* Submit Proposal CTA */}
            {result.status === "BORDERLINE" && team ? (
              <Button
                onClick={handleProposeTheme}
                disabled={isSubmitting}
                className="w-full gold-btn rounded-full py-5 font-heading tracking-widest text-sm mt-4 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "SE TRANSMITE..." : "TRIMITE PROPUNEREA CĂTRE QUIZMASTER"}</span>
              </Button>
            ) : result.status === "BORDERLINE" && !team ? (
              <div className="mt-4 text-xs text-amber-400 text-center font-bold">
                * Doar echipele logate pot trimite propuneri la limită către Quizmaster.
              </div>
            ) : null}

          </div>
        )}

      </div>
    </div>
  );
}
