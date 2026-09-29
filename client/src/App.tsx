import { lazy, Suspense } from "react";
import { t, useLanguage } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const Account = lazy(() => import("@/pages/Account"));

function Router() {
  return (
    <Suspense fallback={<main role="status" className="min-h-screen bg-[#07020d] p-8 text-purple-200">{t("Se încarcă…")}</main>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/cont" component={Account} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useLanguage();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <LanguageToggle />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
