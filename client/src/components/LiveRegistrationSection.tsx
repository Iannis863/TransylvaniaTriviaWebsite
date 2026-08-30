import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Users, 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert, 
  Send,
  Zap
} from "lucide-react";

const registrationSchema = z.object({
  teamName: z.string().min(2, "Numele echipei trebuie să aibă cel puțin 2 caractere"),
  captainName: z.string().min(2, "Numele căpitanului trebuie să aibă cel puțin 2 caractere"),
  email: z.string().email("Te rugăm să introduci o adresă de email validă"),
  phoneNumber: z.string().optional(),
  memberCount: z.number().min(1, "Este necesar cel puțin 1 membru").max(6, "Sunt permiși maximum 6 membri"),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface LiveRegistrationSectionProps {
  editionId: string;
  editionLabel: string;
  isFull: boolean;
  onRegistrationSuccess: () => void;
}

export default function LiveRegistrationSection({
  editionId,
  editionLabel,
  isFull,
  onRegistrationSuccess,
}: LiveRegistrationSectionProps) {
  const { user, team, teamMembers } = useAuth();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      teamName: team?.name || "",
      captainName: user?.name || "",
      email: user?.email || "",
      phoneNumber: "",
      memberCount: teamMembers.length > 0 ? Math.min(6, Math.max(1, teamMembers.length)) : 4,
    },
  });

  const handleLeaderOneClickRegister = async () => {
    if (!user || !team) return;
    setIsSubmitting(true);

    try {
      const payload = {
        editionId,
        teamId: team.id,
        teamName: team.name,
        captainName: user.name,
        email: user.email,
        phoneNumber: "",
        memberCount: Math.min(6, Math.max(1, teamMembers.length || 4)),
      };

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Înregistrare eșuată", description: data.message, variant: "destructive" });
      } else {
        setIsSuccess(true);
        toast({ title: "🎉 Echipa ta a fost înscrisă!", description: `Ne vedem ${editionLabel} la Insomnia Restaurant!` });
        onRegistrationSuccess();
      }
    } catch (err) {
      toast({ title: "Eroare", description: "Nu s-a putut efectua înscrierea", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        editionId,
        teamId: team?.id || undefined,
      };

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        toast({ title: "Înscriere eșuată", description: resData.message, variant: "destructive" });
      } else {
        setIsSuccess(true);
        toast({ title: "🎉 Înscriere Reușită!", description: "Confirmarea a fost trimisă pe email." });
        onRegistrationSuccess();
      }
    } catch (err) {
      toast({ title: "Eroare", description: "Eroare la procesarea formularului", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="registration" className="py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Section Title */}
        <div className="text-center mb-8">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-3 py-1 font-semibold uppercase tracking-wider mb-2">
            Rezervare Masă & Locuri
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading tracking-widest text-gold-gradient">
            ÎNREGISTRARE EDIȚIA CURENTĂ
          </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-1">
            Asigură masa echipei tale pentru {editionLabel}. Participarea este de 10 lei de persoană.
          </p>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="gold-card rounded-2xl p-8 text-center border-2 border-emerald-400/50 shadow-[0_0_40px_rgba(52,211,153,0.25)] animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-heading tracking-wider text-emerald-300 mb-2">
              LOCUL VOSTRU ESTE CONFIRMAT!
            </h3>
            <p className="text-purple-200 max-w-md mx-auto text-sm sm:text-base mb-6">
              Masa este rezervată la Insomnia Restaurant pentru <strong>{editionLabel}</strong>. Veți primi instrucțiunile și punctajul live în timpul serii.
            </p>
            <Button
              onClick={() => setIsSuccess(false)}
              variant="outline"
              className="border-amber-400/50 text-amber-300 hover:bg-amber-400/20 font-heading text-sm"
            >
              Înscrie O Altă Echipă
            </Button>
          </div>
        ) : isFull ? (
          <div className="gold-card rounded-2xl p-8 text-center border border-red-500/40 bg-red-950/20">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-2xl font-heading text-red-300">TOATE LOCURILE SUNT OCUPATE!</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
              Capacitatea maximă de 25 de echipe a fost atinsă pentru această ediție. Vă puteți înscrie pe lista de așteptare la bar sau pentru ediția de marțea viitoare.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Quick 1-Click Leader Card (if logged in as leader) */}
            {user && team && user.role === "TEAM_LEADER" && (
              <div className="lg:col-span-12">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-amber-500/10 border-2 border-amber-400/60 shadow-[0_0_30px_rgba(246,184,40,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-2xl shadow-md">
                      👑
                    </div>
                    <div>
                      <div className="text-xs text-amber-300 font-semibold tracking-wider uppercase">Înscriere Rapidă Căpitan</div>
                      <div className="font-heading text-2xl text-white">{team.name}</div>
                      <div className="text-xs text-purple-300">
                        Căpitan: {user.name} • {teamMembers.length || 4} membri înregistrați
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLeaderOneClickRegister}
                    disabled={isSubmitting}
                    className="gold-btn w-full sm:w-auto px-6 py-5 font-heading tracking-widest text-base flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5 fill-purple-950" />
                    {isSubmitting ? "SE PROCESEAZĂ..." : "1-CLICK ÎNSCRIERE ECHIPĂ"}
                  </Button>
                </div>
              </div>
            )}

            {/* Standard Registration Form */}
            <div className="lg:col-span-12">
              <Card className="gold-card border border-amber-400/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2.5 text-xl font-heading tracking-wider text-amber-300">
                    <Crown className="w-5 h-5 text-amber-400" />
                    Formular de Înregistrare Echipă
                  </CardTitle>
                  <CardDescription className="text-purple-300/70 text-xs">
                    Completează detaliile pentru masa echipei tale la Insomnia Restaurant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="teamName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-purple-200">Nume Echipă *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Geniile Carpaților" 
                                  {...field} 
                                  className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="captainName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-purple-200">Nume Căpitan / Reprezentant *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Vlad Țepeș" 
                                  {...field} 
                                  className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="text-xs text-purple-200">Adresă Email (pentru confirmare & memento) *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="echipa@exemplu.ro" 
                                  {...field} 
                                  className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="memberCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-purple-200">Membri (1 - 6) *</FormLabel>
                              <Select 
                                onValueChange={(val) => field.onChange(parseInt(val))}
                                defaultValue={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm">
                                    <SelectValue placeholder="Mărime echipă" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#120722] border border-purple-700/60 text-white">
                                  <SelectItem value="1">1 Jucător (Solo)</SelectItem>
                                  <SelectItem value="2">2 Jucători</SelectItem>
                                  <SelectItem value="3">3 Jucători</SelectItem>
                                  <SelectItem value="4">4 Jucători</SelectItem>
                                  <SelectItem value="5">5 Jucători</SelectItem>
                                  <SelectItem value="6">6 Jucători (Maxim)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-purple-200">Număr de Telefon (Opțional, pentru SMS reminder)</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel"
                                placeholder="+40 7XX XXX XXX" 
                                {...field} 
                                className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full gold-btn py-5 font-heading tracking-widest text-lg mt-2 flex items-center justify-center gap-2"
                      >
                        <Send className="w-5 h-5 text-purple-950" />
                        {isSubmitting ? "SE TRIMITE ÎNREGISTRAREA..." : "CONFIRMĂ PARTICIPAREA ECHIPEI"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}
