import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Send, 
  HelpCircle,
  TrendingUp,
  BrainCircuit,
  Trophy
} from "lucide-react";

interface ThemeValidatorProps {
  editionId?: string;
}

interface ValidationResult {
  theme: string;
  score: number;
  status: "APPROVED" | "BORDERLINE" | "REJECTED";
  feedback: string;
  category: string;
  sampleQuestions: string[];
  isEligible: boolean;
}

export default function ThemeValidator({ editionId }: ThemeValidatorProps) {
  const { user, team } = useAuth();
  const { toast } = useToast();
  const [themeInput, setThemeInput] = useState("");
  const [proposerName, setProposerName] = useState(team ? team.name : user ? user.name : "Echipa de pe ultimul loc");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeInput.trim() || themeInput.trim().length < 3) {
      toast({ title: "Introdu o temă validă", description: "Tema trebuie să conțină cel puțin 3 caractere.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setIsSubmitted(false);

    try {
      const res = await fetch("/api/theme-validator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: themeInput.trim(),
          proposedBy: proposerName,
          teamId: team?.id || null,
          editionId: editionId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Eroare validare", description: data.message, variant: "destructive" });
      } else {
        setResult(data);
      }
    } catch (err) {
      toast({ title: "Eroare", description: "Nu s-a putut analiza tema", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitToQuizmaster = () => {
    setIsSubmitted(true);
    toast({
      title: "🎉 Temă Propusă cu Succes!",
      description: `Tema "${result?.theme}" a fost trimisă către Quizmaster pentru evaluare!`,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400 border-emerald-400";
    if (score >= 50) return "text-amber-400 border-amber-400";
    return "text-red-400 border-red-400";
  };

  return (
    <Card className="gold-card border border-amber-400/40 shadow-[0_0_35px_rgba(246,184,40,0.15)] rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500/15 via-purple-900/30 to-amber-500/10 pb-4 border-b border-purple-800/40">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-amber-400" />
          <Badge className="bg-amber-400 text-purple-950 font-bold text-xs">
            Privilegiul Echipei de pe Ultimul Loc
          </Badge>
        </div>
        <CardTitle className="text-2xl font-heading tracking-wider text-gold-gradient">
          VALIDATORUL DE ELIGIBILITATE A TEMELOR
        </CardTitle>
        <CardDescription className="text-purple-200/80 text-xs sm:text-sm">
          Ai terminat pe ultimul loc? Ai puterea de a alege tema uneia dintre rundele speciale de săptămâna viitoare! Testează eligibilitatea temei dorite mai jos.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        
        {/* Input Form */}
        <form onSubmit={handleValidate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-purple-200 block mb-1">
                Tema Propusă pentru Următoarea Ediție *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Ex: Muzica Rock a Anilor '90, Mitologie Nordică, Seriale Netflix..."
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  className="pl-9 bg-purple-950/50 border-purple-700/60 focus:border-amber-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-purple-200 block mb-1">
                Echipa Propunătoare
              </label>
              <Input
                placeholder="Numele Echipei"
                value={proposerName}
                onChange={(e) => setProposerName(e.target.value)}
                className="bg-purple-950/50 border-purple-700/60 focus:border-amber-400 text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isAnalyzing}
            className="w-full gold-btn py-4 font-heading tracking-wider text-base flex items-center justify-center gap-2"
          >
            <BrainCircuit className="w-5 h-5 text-purple-950" />
            {isAnalyzing ? "SE ANALIZEAZĂ POPULARITATEA & ELIGIBILITATEA..." : "VALIDEAZĂ POTENȚIALUL TEMEI"}
          </Button>
        </form>

        {/* Validation Result Box */}
        {result && (
          <div className="mt-6 pt-6 border-t border-purple-800/40 animate-in fade-in-50 duration-300">
            
            {/* Score & Verdict Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-950/60 p-4 rounded-xl border border-purple-700/50 mb-4">
              
              <div className="flex items-center gap-3.5">
                <div className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-heading ${getScoreColor(result.score)} bg-purple-900/60 shadow`}>
                  <span className="text-2xl font-bold leading-none">{result.score}</span>
                  <span className="text-[9px] font-sans font-bold uppercase tracking-wider">/ 100</span>
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white uppercase">{result.theme}</span>
                    {result.status === "APPROVED" && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                        APROBAT & FEZABIL
                      </Badge>
                    )}
                    {result.status === "BORDERLINE" && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                        LA LIMITĂ
                      </Badge>
                    )}
                    {result.status === "REJECTED" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px]">
                        PREA RESTRICTIV
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-purple-200 mt-1">{result.feedback}</p>
                </div>
              </div>

              {result.isEligible && !isSubmitted && (
                <Button
                  onClick={handleSubmitToQuizmaster}
                  className="gold-btn text-xs font-heading tracking-wider px-4 py-2 self-end sm:self-center flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  TRIMITE TEMĂ QUIZMASTERULUI
                </Button>
              )}
            </div>

            {/* Generated Question Previews */}
            <div className="bg-[#130724] p-4 rounded-xl border border-purple-800/40 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Exemple de Întrebări Generate din această Temă:
              </div>
              <div className="space-y-1.5 text-xs text-purple-200/90 font-mono">
                {result.sampleQuestions.map((q, idx) => (
                  <div key={idx} className="p-2 rounded bg-purple-950/40 border border-purple-800/30">
                    {q}
                  </div>
                ))}
              </div>
            </div>

            {isSubmitted && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Propunerea a fost salvată în baza de date a concursului!
              </div>
            )}

          </div>
        )}

      </CardContent>
    </Card>
  );
}
