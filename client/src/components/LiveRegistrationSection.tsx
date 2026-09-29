import { t, getLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Users,
  Crown,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Send,
  Zap,
  ArrowRight
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
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      teamName: team?.name || "",
      captainName: user?.name || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      memberCount: teamMembers.length > 0 ? Math.min(6, Math.max(1, teamMembers.length)) : 4,
    },
  });

  // Auth loads after the form mounts. Fill account details without replacing an edit.
  const { dirtyFields, touchedFields } = form.formState;
  useEffect(() => {
    const defaults: RegistrationFormData = {
      teamName: team?.name || "",
      captainName: user?.name || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      memberCount: teamMembers.length > 0 ? Math.min(6, teamMembers.length) : 4,
    };
    for (const field of Object.keys(defaults) as (keyof RegistrationFormData)[]) {
      if (!dirtyFields[field] && !touchedFields[field] && form.getValues(field) !== defaults[field]) {
        form.resetField(field, { defaultValue: defaults[field] });
      }
    }
  }, [form, user?.id, user?.name, user?.email, user?.phoneNumber, team?.id, team?.name, teamMembers.length, dirtyFields, touchedFields]);

  const handleLeaderOneClickRegister = async () => {
    if (!user || !team) return;
    setIsSubmitting(true);

    try {
      const payload = {
        language: getLanguage(),
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
        toast({ title: t("Înregistrare eșuată"), description: data.message, variant: "destructive" });
      } else {
        setIsSuccess(true);
        setIsWaitlisted(data.status === "WAITLISTED");
        window.dispatchEvent(new Event("registration-updated"));
        toast({ title: data.status === "WAITLISTED" ? t("Echipa este pe lista de așteptare") : t("Echipa ta a fost acceptată!"), description: data.status === "WAITLISTED" ? t("Locul nu este încă rezervat. Vei primi confirmarea dacă quizmasterul vă acceptă.") : t("Ne vedem {0} la Insomnia Cafe & Bistro!", [editionLabel]) });
        onRegistrationSuccess();
      }
    } catch (err) {
      toast({ title: t("Eroare"), description: t("Nu s-a putut efectua înscrierea"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        language: getLanguage(),
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
        toast({ title: t("Înscriere eșuată"), description: resData.message, variant: "destructive" });
      } else {
        setIsSuccess(true);
        setIsWaitlisted(resData.status === "WAITLISTED");
        window.dispatchEvent(new Event("registration-updated"));
        toast({ title: resData.status === "WAITLISTED" ? t("Pe lista de așteptare") : t("Înscriere acceptată!"), description: resData.status === "WAITLISTED" ? t("Locul nu este încă rezervat. Te anunțăm pe email dacă echipa este acceptată.") : resData.emailStatus === "sent" ? t("Confirmarea a fost trimisă pe email.") : t("Locul este rezervat. Confirmarea pe email este în curs de trimitere.") });
        onRegistrationSuccess();
      }
    } catch (err) {
      toast({ title: t("Eroare"), description: t("Eroare la procesarea formularului"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="registration" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-4xl mx-auto">

        {/* Section Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 mb-3 shadow-[0_0_15px_rgba(246,184,40,0.15)]">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
             {t("Rezervare Masă & Locuri")} </div>
          <h2 className="text-3xl sm:text-5xl font-heading tracking-widest text-gold-gradient pt-2 pb-1">
             {t("ÎNREGISTRARE LA EDIȚIA CURENTĂ")} </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-2 font-light">
             {t("Asigură masa echipei tale pentru")} {editionLabel}{t(". Taxa este de 10 lei de persoană.")} </p>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="p-2.5 rounded-[2.5rem] bg-gradient-to-b from-emerald-500/20 to-emerald-950/20 ring-1 ring-emerald-400/50 shadow-[0_0_50px_rgba(52,211,153,0.3)] animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-12 rounded-[calc(2.5rem-0.5rem)] bg-[#0a1612] text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-heading tracking-wider text-emerald-300 mb-2">
                {isWaitlisted ? t("SUNTEȚI PE LISTA DE AȘTEPTARE") : t("LOCUL VOSTRU ESTE CONFIRMAT!")}
              </h3>
              <p className="text-emerald-100/90 max-w-md mx-auto text-sm sm:text-base mb-6 font-light">
                {isWaitlisted ? t("Înscrierea a fost primită, dar nu aveți încă un loc rezervat. Dacă quizmasterul vă acceptă, primiți un email de confirmare. Așteptați confirmarea înainte de a veni la eveniment.") : <>{t("Masa este rezervată la Insomnia Cafe & Bistro pentru")} <strong>{editionLabel}</strong>{t(". Vă așteptăm cu drag!")}</>}
              </p>
              <Button
                onClick={() => setIsSuccess(false)}
                variant="outline"
                className="rounded-full border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/20 font-heading text-sm px-6 py-4"
              >
                 {t("Înscrie O Altă Echipă")} </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {isFull && <div role="status" className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-amber-200 text-sm">
               {t("Locurile pentru înscriere directă sunt ocupate. Te poți înscrie pe lista de așteptare; locul este rezervat doar după acceptarea de către quizmaster și primirea confirmării.")} </div>}

            {/* Quick 1-Click Leader Card */}
            {user && team && user.role === "TEAM_LEADER" && (
              <div className="p-2 rounded-[2rem] bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-amber-500/10 ring-2 ring-amber-400/60 shadow-[0_0_35px_rgba(246,184,40,0.3)]">
                <div className="p-6 rounded-[calc(2rem-0.5rem)] bg-[#0e041d] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-2xl shadow-md">
                      👑
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">{t("Înscriere Rapidă Căpitan")}</div>
                      <div className="font-heading text-2xl text-white mt-0.5">{team.name}</div>
                      <div className="text-xs text-purple-300/80">
                         {t("Căpitan:")} {user.name} • {teamMembers.length || 4}  {t("membri în echipă")} </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLeaderOneClickRegister}
                    disabled={isSubmitting}
                    className="gold-btn h-auto min-h-12 whitespace-normal rounded-full px-6 py-4 font-heading tracking-widest text-base flex items-center gap-2 group w-full sm:w-auto justify-center"
                  >
                    <Zap className="w-4 h-4 fill-purple-950 text-purple-950" />
                    <span>{isSubmitting ? t("SE PROCESEAZĂ...") : (isFull ? t("INTRĂ PE LISTA DE AȘTEPTARE") : t("1-CLICK ÎNSCRIERE ECHIPĂ"))}</span>
                    <span className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5 text-purple-950" />
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Standard Double-Bezel Form Shell */}
            <div className="p-2 sm:p-2.5 rounded-[2.5rem] bg-gradient-to-b from-purple-900/20 to-purple-950/10 ring-1 ring-purple-500/30 shadow-2xl">
              <div className="p-6 sm:p-10 rounded-[calc(2.5rem-0.5rem)] bg-[#0e041d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">

                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-purple-800/40">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl text-white tracking-wider">
                       {t("Formular Oficial de Înregistrare Echipei")} </h3>
                    <p className="text-xs text-purple-300/70">
                       {t("Completează datele echipei pentru rezervarea mesei la Insomnia Cafe & Bistro")} </p>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="teamName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-purple-200">{t("Nume Echipă *")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("Ex: Geniile Carpaților")}
                                {...field}
                                className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm h-11 rounded-xl"
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
                            <FormLabel className="text-xs text-purple-200">{t("Nume Căpitan *")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("Ex: Vlad Țepeș")}
                                {...field}
                                className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm h-11 rounded-xl"
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
                            <FormLabel className="text-xs text-purple-200">{t("Adresă Email (pentru confirmare) *")}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="echipa@exemplu.ro"
                                {...field}
                                className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm h-11 rounded-xl"
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
                            <FormLabel className="text-xs text-purple-200">{t("Membri (1 - 6) *")}</FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(parseInt(val))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm h-11 rounded-xl">
                                  <SelectValue placeholder={t("Mărime echipă")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#120722] border border-purple-700/60 text-white">
                                <SelectItem value="1">{t("1 Jucător (Solo)")}</SelectItem>
                                <SelectItem value="2">{t("2 Jucători")}</SelectItem>
                                <SelectItem value="3">{t("3 Jucători")}</SelectItem>
                                <SelectItem value="4">{t("4 Jucători")}</SelectItem>
                                <SelectItem value="5">{t("5 Jucători")}</SelectItem>
                                <SelectItem value="6">{t("6 Jucători (Maxim)")}</SelectItem>
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
                          <FormLabel className="text-xs text-purple-200">{t("Număr de Telefon (Opțional)")}</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+40 7XX XXX XXX"
                              {...field}
                              className="bg-purple-950/40 border-purple-700/50 focus:border-amber-400 text-sm h-11 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full gold-btn h-auto min-h-12 whitespace-normal rounded-full py-4 font-heading tracking-widest text-base mt-4 flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(246,184,40,0.35)]"
                    >
                      <span>{isSubmitting ? t("SE PROCESEAZĂ...") : (isFull ? t("INTRĂ PE LISTA DE AȘTEPTARE") : t("ÎNSCRIE ECHIPA"))}</span>
                      <span className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-4 h-4 text-purple-950" />
                      </span>
                    </Button>

                  </form>
                </Form>

              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}
