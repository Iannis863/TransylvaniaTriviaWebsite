import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, CheckCircle } from "lucide-react";

// Translated form validation error messages
const registrationSchema = z.object({
  teamName: z.string().min(2, "Numele echipei trebuie să aibă cel puțin 2 caractere"),
  captainName: z.string().min(2, "Numele căpitanului trebuie să aibă cel puțin 2 caractere"),
  email: z.string().email("Te rugăm să introduci o adresă de email validă"),
  phoneNumber: z.string().optional(),
  memberCount: z.number().min(1, "Este necesar cel puțin 1 membru").max(6, "Sunt允许ți maximum 6 membri"),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function RegistrationForm() {
  const { toast } = useToast();
  const [isRegistered, setIsRegistered] = useState(false);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      teamName: "",
      captainName: "",
      email: "",
      phoneNumber: "",
      memberCount: 2,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await apiRequest("POST", "/api/registrations", data);
      return response.json();
    },
    onSuccess: () => {
      setIsRegistered(true);
      toast({
        title: "Înregistrare Reușită!",
        description: "Echipa ta a fost înregistrată pentru următoarea seară de quiz.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Înregistrare Eșuată",
        description: error.message || "Te rugăm să încerci din nou mai târziu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    registerMutation.mutate(data);
  };

  // Success Screen Component (When user submits successfully)
  if (isRegistered) {
    return (
      <section id="register" className="py-20 px-4">
        <div className="max-w-md mx-auto">
          <Card className="border border-green-500/30 bg-green-500/5">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="font-heading text-2xl tracking-wider mb-2">AI INTRAT ÎN JOC!</h3>
              <p className="text-muted-foreground">
                Echipa ta a fost înregistrată cu succes. Ne vedem marți la ora 20:00!
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  // Active Form Screen
  return (
    <section id="register" className="py-20 px-4">
      <div className="max-w-md mx-auto">
        <h2 
          className="font-heading text-4xl md:text-5xl text-center mb-4 tracking-wider"
          data-testid="text-register-title"
        >
          ÎNREGISTREAZĂ-ȚI ECHIPA
        </h2>
        <p className="text-muted-foreground text-center mb-4">
          Asigură-ți locul pentru următoarea seară de quiz
        </p>
        <p className="text-amber-400 text-center mb-8 font-medium">
          Taxă de participare: 10 lei de persoană
        </p>

        <Card className="border border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-purple-400" />
              Detalii Echipă
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume Echipă</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Geniile Carpaților" 
                          {...field} 
                          data-testid="input-team-name"
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
                      <FormLabel>Nume Căpitan</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Numele tău" 
                          {...field} 
                          data-testid="input-captain-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="echipa@exemplu.com" 
                          {...field} 
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Număr de Telefon (Opțional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="+40 XXX XXX XXX" 
                          {...field} 
                          data-testid="input-phone"
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
                      <FormLabel>Număr de Membri în Echipă</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-member-count">
                            <SelectValue placeholder="Selectează dimensiunea echipei" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 Membru</SelectItem>
                          <SelectItem value="2">2 Membri</SelectItem>
                          <SelectItem value="3">3 Membri</SelectItem>
                          <SelectItem value="4">4 Membri</SelectItem>
                          <SelectItem value="5">5 Membri</SelectItem>
                          <SelectItem value="6">6 Membri (Maxim)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full mt-6 font-heading tracking-wider"
                  disabled={registerMutation.isPending}
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? "SE ÎNREGISTREAZĂ..." : "ÎNREGISTREAZĂ ECHIPA"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
