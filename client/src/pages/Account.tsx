import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Trash2, UserMinus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Account() {
  const { user, team, refreshAuth, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themeSuggestions, setThemeSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (user?.teamId) {
      fetch("/api/auth/me/theme-suggestions", {
        headers: { "x-user-id": user.id }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setThemeSuggestions(data);
      })
      .catch(console.error);
    }
  }, [user]);

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ name, email, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Cont actualizat cu succes!" });
      await refreshAuth();
    } catch (err: any) {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      const res = await fetch("/api/teams/leave", {
        method: "POST",
        headers: { "x-user-id": user.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Ai părăsit echipa." });
      await refreshAuth();
    } catch (err: any) {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Cont șters definitiv." });
      logout();
    } catch (err: any) {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-amber-500/30">
      <Navbar activeSection="" onNavigate={() => setLocation("/")} />
      <main className="max-w-2xl mx-auto px-4 py-24">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
          Contul Meu
        </h1>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8 space-y-8">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nume</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-950 border-gray-800 focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresă de email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-950 border-gray-800 focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Număr de telefon (Opțional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-gray-950 border-gray-800 focus:border-amber-500"
                  placeholder="07xx xxx xxx"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {isSubmitting ? "Se salvează..." : "Salvează Modificările"}
            </Button>
          </form>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Echipa Ta</h3>
            {team ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-950 rounded-lg border border-gray-800 gap-4">
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-sm text-gray-400">
                    Rol: {user.role === "TEAM_LEADER" ? "Căpitan" : "Membru"}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400 shrink-0">
                      <UserMinus className="w-4 h-4 mr-2" />
                      Părăsește Echipa
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        {user.role === "TEAM_LEADER" 
                          ? "Ești căpitanul echipei. Dacă pleci, cel mai vechi membru va deveni noul căpitan. Dacă ești singurul membru, echipa va fi ștearsă definitiv."
                          : "Vei părăsi această echipă și nu vei mai avea acces la progresul ei."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-gray-700 hover:bg-gray-800 text-white">Anulează</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeaveTeam} className="bg-red-500 hover:bg-red-600 text-white">
                        Confirmă
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Nu ești în nicio echipă în acest moment.</p>
            )}
          </div>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Propuneri Teme (Echipă)</h3>
            {themeSuggestions.length > 0 ? (
              <div className="space-y-3">
                {themeSuggestions.map((theme: any) => (
                  <div key={theme.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-950 rounded-lg border border-gray-800 gap-4">
                    <div>
                      <p className="font-medium">{theme.themeName}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Status scor: {theme.popularityScore}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                        theme.status === "APPROVED" 
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                          : theme.status === "REJECTED"
                          ? "bg-red-500/20 text-red-300 border-red-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}>
                        {theme.status === "PENDING" ? "ÎN AȘTEPTARE" : theme.status === "APPROVED" ? "ACCEPTAT" : "RESPINS"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Echipa ta nu a propus nicio temă încă.</p>
            )}
          </div>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-red-400">Ștergere Cont</h3>
            <p className="text-sm text-gray-400">
              Vei părăsi automat echipa, iar contul tău va fi șters definitiv.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Șterge Contul
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Acest lucru îți va șterge permanent contul.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-gray-700 hover:bg-gray-800 text-white">Anulează</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600 text-white">
                    Șterge Contul
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </main>
    </div>
  );
}
