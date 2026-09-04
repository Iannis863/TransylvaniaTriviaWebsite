import { useState } from "react";
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
                <Label htmlFor="name">Nume complet</Label>
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
            <h3 className="text-xl font-semibold text-red-400">Zonă de Pericol</h3>
            <p className="text-sm text-gray-400">
              Odată ce îți ștergi contul, nu mai există cale de întoarcere. Te rugăm să fii sigur.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Șterge Contul Definitiv
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Ștergere Definitivă</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Acest lucru îți va șterge permanent contul și îți va elimina datele de pe serverele noastre.
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
