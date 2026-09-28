import { t } from "@/lib/i18n";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Sparkles,
  Crown,
  HelpCircle,
  Flame,
  Zap,
  CheckCircle2,
  Scale,
  Trophy,
  Layers,
  ArrowRight
} from "lucide-react";
import ThemeValidator from "./ThemeValidator";

export default function RulebookSection() {
  const [activeTab, setActiveTab] = useState("rounds");

  const rounds = [
    {
      number: "1",
      name: t("Cultură Generală"),
      questions: t("10 Întrebări"),
      points: t("1 punct / răspuns corect"),
      desc: t("Întrebări diverse de încălzire din științe, geografie, istorie și multe altele."),
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "2",
      name: t("Ghicește Legătura"),
      questions: t("10 legături"),
      points: t("1 punct / răspuns corect"),
      desc: t("Vor fi afișate 3 imagini pe ecran și va trebui să ghiciți care este legătura dintre ele."),
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "3",
      name: t("Ghicește Melodia"),
      questions: t("10 melodii"),
      points: t("0.5/melodie & 0.5/artist"),
      desc: t("Recunoaște numele melodiei și artistul pentru 10 piese din genuri și perioade muzicale variate."),
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "4",
      name: t("Runda Surpriză"),
      questions: t("10 Întrebări"),
      points: t("1 punct / răspuns corect"),
      desc: t("Pentru a afla categoria rundei, rezolvă alături de echipă cele 5 jocuri din meniul de jocuri."),
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "5",
      name: t("Runda Aleasă"),
      questions: t("10 Întrebări"),
      points: t("1 punct / răspuns corect"),
      desc: t("Această rundă este aleasă de echipa care s-a clasat pe ultimul loc la ediția precedentă."),
      jokerEligible: true,
      hasJokerBadge: true,
    },
    {
      number: "P",
      name: t("Pariul"),
      questions: t("1 Întrebare Bonus"),
      points: t("Pariu (2 - 20 puncte)"),
      desc: t("Întrebare de dificultate ridicată cu 4 variante de răspuns."),
      jokerEligible: false,
      hasJokerBadge: false,
    },
  ];

  return (
    <section id="rulebook" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto">

        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
             {t("Desfășurare & Mecanici")} </div>
          <h2 className="text-3xl sm:text-5xl font-heading tracking-widest text-gold-gradient">
             {t("REGULAMENTUL OFICIAL")} </h2>
          <p className="text-purple-200/80 text-sm sm:text-base max-w-xl mx-auto mt-2 font-light">
             {t("Descoperă structura celor 5 runde, Jokerul, Pariul și validatorul de teme.")} </p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          <div className="flex justify-center mb-8">
            <TabsList className="bg-purple-950/80 border border-purple-700/50 p-0 overflow-hidden rounded-full">
              <TabsTrigger
                value="rounds"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                 {t("Cele 5 Runde & Pariul")} </TabsTrigger>
              <TabsTrigger
                value="mechanics"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                 {t("Regulament")} </TabsTrigger>
              <TabsTrigger
                value="validator"
                className="data-[state=active]:bg-amber-400 data-[state=active]:text-purple-950 font-heading text-xs sm:text-sm tracking-wider px-6 py-2.5 rounded-full transition-all"
              >
                 {t("Validator Teme Noi")} </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: ROUNDS BREAKDOWN + CARDS */}
          <TabsContent value="rounds" className="space-y-8">
            <div className="grid grid-cols-1 gap-4">
              {rounds.map((round) => (
                <div
                  key={round.number}
                  className="p-1 rounded-2xl bg-purple-950/20 border border-purple-800/40 hover:border-amber-400/40 transition-all shadow-md"
                >
                  <div className="p-5 rounded-xl bg-[#0f041e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-purple-950 font-heading font-bold flex items-center justify-center shadow flex-shrink-0">
                        <span className={round.number === "P" ? "text-3xl" : "text-xl"}>
                          {round.number === "P" ? "P" : `R${round.number}`}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <h3 className="font-heading text-lg text-white tracking-wide">{round.name}</h3>
                          {round.hasJokerBadge && (
                            round.jokerEligible ? (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px]">
                                 {t("JOKER APLICABIL")} </Badge>
                            ) : (
                              <Badge variant="outline" className="text-purple-300 text-[10px]">
                                 {t("FĂRĂ JOKER")} </Badge>
                            )
                          )}
                        </div>
                        <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">{round.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center font-mono text-xs flex-shrink-0">
                      <span className="text-purple-300">{round.questions}</span>
                      <span className="text-amber-400 font-bold">|</span>
                      <span className="text-amber-300 font-bold">{round.points}</span>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Mechanics Cards in the same tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Joker Card */}
              <div className="p-2 rounded-[2rem] bg-gradient-to-b from-amber-500/15 via-purple-900/10 to-amber-500/5 ring-1 ring-amber-400/30 shadow-xl">
                <div className="p-6 rounded-[calc(2rem-0.5rem)] bg-[#0e041d] h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl mb-4">
                      🃏
                    </div>
                    <h3 className="text-xl font-heading text-gold-gradient tracking-wide mb-2">
                       {t("CARDUL JOKER")} </h3>
                    <p className="text-xs text-purple-200/80 leading-relaxed space-y-2">
                       {t("Poți folosi cardul Joker la începutul oricărei din cele 5 runde (dar")} <strong className="text-amber-300">{t("înainte ca întrebările să înceapă")}</strong>{t("). Pe Joker, alegi runda și prezici câte puncte vei face (de ex. 7 puncte).")} </p>
                    <div className="mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-800/40 text-[11px] text-amber-300 font-medium space-y-2">
                      <p>{t("⚡ Dacă faci cel puțin numărul prezis (x), mai primești încă x puncte. Dacă nu atingi numărul de puncte prezis, nu primești niciun punct bonus.")}</p>
                      <p className="text-emerald-400 font-bold">{t("✨ Dacă prezici 10 și reușești să aduni 10 puncte, punctajul se triplează (primești 20 puncte bonus)!")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Gamble */}
              <div className="p-2 rounded-[2rem] bg-purple-950/20 ring-1 ring-purple-500/30 shadow-xl">
                <div className="p-6 rounded-[calc(2rem-0.5rem)] bg-[#0e041d] h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl mb-4">
                      🎲
                    </div>
                    <h3 className="text-xl font-heading text-purple-200 tracking-wide mb-2">
                       {t("PARIUL")} </h3>
                    <p className="text-xs text-purple-200/80 leading-relaxed">
                       {t("După cele 5 runde, urmează o întrebare bonus mult mai dificilă, cu 4 variante de răspuns (A, B, C, D). Poți paria între 2 și 20 de puncte din punctele acumulate pe parcursul celor 5 runde.")} </p>
                    <div className="mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-800/40 text-[11px] text-purple-300 font-medium">
                       {t("⚠️ Dacă răspunzi corect, miza pariată se dublează! Dacă greșești, pierzi tot ce ai pariat. Ai grijă!")} </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: REGULAMENT */}
          <TabsContent value="mechanics" className="space-y-6">
            <div className="p-8 sm:p-12 rounded-[2.5rem] bg-purple-950/20 ring-1 ring-purple-800/40 shadow-xl">
              <div className="max-w-3xl mx-auto space-y-10">

                <div className="border-b border-purple-800/50 pb-6">
                  <h3 className="text-2xl font-heading text-white tracking-wide flex items-center gap-3">
                    <CheckCircle2 className="text-amber-400 w-6 h-6" />
                     {t("1. Desfășurarea Rundelor & Punctajul")} </h3>
                  <ul className="mt-5 space-y-3 text-purple-200/80 text-sm sm:text-base list-disc list-inside">
                    <li><strong className="text-purple-100">{t("Runda 1 - Cultură Generală:")}</strong>  {t("Începem cu 10 întrebări diverse de încălzire.")}</li>
                    <li><strong className="text-purple-100">{t("Runda 2 - Ghicește Legătura:")}</strong>  {t("Veți primi 3 imagini pe ecran, iar voi trebuie să ghiciți legătura dintre ele. Uneori o serie de imagini poate avea mai multe legături valide. Dacă echipa ta găsește o variantă inedită care s-ar putea potrivi, vom recurge la un vot democratic. Dacă cel puțin jumătate din echipe sunt de acord, veți primi punctul.")}</li>
                    <li><strong className="text-purple-100">{t("Runda 3 - Ghicește Melodia:")}</strong>  {t("Se acordă 0.5 puncte pentru numele piesei și 0.5 puncte pentru artist. Dacă melodia are mai mulți artiști asociați, este suficient să menționezi doar unul dintre ei pentru punctajul maxim.")}</li>
                    <li><strong className="text-purple-100">{t("Runda 4 - Surpriza:")}</strong>  {t("Dacă dorești să afli categoria din avans, rezolvă toate cele 5 jocuri de pe platformă.")}</li>
                    <li><strong className="text-purple-100">{t("Runda 5 - Runda Aleasă:")}</strong>  {t("Tema este mereu aleasă de echipa care s-a clasat pe ultimul loc la ediția precedentă.")}</li>
                    <li><strong className="text-purple-100">{t("Evaluare & Răspunsuri Parțiale:")}</strong>  {t("De regulă se acordă 1 punct pentru răspuns corect și 0 pentru greșit. Totuși, se pot acorda și fracțiuni de punct pentru răspunsurile parțial corecte!")}</li>
                    <li><strong className="text-purple-100">{t("Verificarea Răspunsurilor:")}</strong>  {t("La finalul fiecărei runde, echipele fac schimb de foi în sensul acelor de ceasornic. Colegii de la masa alăturată vor verifica răspunsurile și vor calcula punctajul rundei, după care foile se returnează la echipa inițială.")}</li>
                  </ul>
                </div>

                <div className="border-b border-purple-800/50 pb-6">
                  <h3 className="text-2xl font-heading text-white tracking-wide flex items-center gap-3">
                    <Layers className="text-amber-400 w-6 h-6" />
                     {t("2. Runda Aleasă & Validatorul")} </h3>
                  <ul className="mt-5 space-y-3 text-purple-200/80 text-sm sm:text-base list-disc list-inside">
                    <li><strong className="text-purple-100">{t("Avantajul Ultimului Loc:")}</strong>  {t("Tema pentru Runda 5 este mereu decisă de echipa care s-a clasat pe ultimul loc la ediția precedentă.")}</li>
                    <li><strong className="text-purple-100">{t("Regula Validatorului:")}</strong>  {t("Nu ești obligat să o treci prin")} <strong>{t("Validatorul de Teme")}</strong>  {t("de pe platformă, dar te ajută să-ți dai seama dacă ar fi eligibilă sau nu. Un scor de ≥50 înseamnă că tema este fezabilă; un scor sub 50 înseamnă că e probabil prea dificilă, prea de nișă sau necunoscută.")}</li>
                    <li><strong className="text-purple-100">{t("Aprobarea Finală:")}</strong>  {t("Indiferent de scorul Validatorului, Quizmaster-ul are întotdeauna ultimul cuvânt. Trebuie să fii logat în contul tău pentru a trimite tema la validare, de unde îi vei putea urmări statusul:")} <em>{t("În Așteptare (Pending)")}</em>, <em>{t("Aprobată")}</em>  {t("sau")} <em>{t("Respinsă")}</em>.</li>
                  </ul>
                </div>

                <div className="border-b border-purple-800/50 pb-6">
                  <h3 className="text-2xl font-heading text-white tracking-wide flex items-center gap-3">
                    <Trophy className="text-amber-400 w-6 h-6" />
                     {t("3. Pauze, Departajare & Premii")} </h3>
                  <ul className="mt-5 space-y-3 text-purple-200/80 text-sm sm:text-base list-disc list-inside">
                    <li><strong className="text-purple-100">{t("Pauzele:")}</strong>  {t("Avem două pauze de realimentare. Prima este de 15 minute, imediat după Runda 3. A doua pauză este de 10 minute, fix înaintea Pariului. La revenirea din pauze vom afișa mereu clasamentul parțial la zi, astfel încât să știți exact cum stați (și cât puteți paria).")}</li>
                    <li><strong className="text-purple-100">{t("Egalitate:")}</strong>  {t("În caz de egalitate pentru podium sau pentru stabilirea ultimului loc, vom avea o întrebare numerică de departajare (ex: „În ce an a fost construit Turnul Eiffel?”). Echipa cu răspunsul cel mai apropiat câștigă!")}</li>
                    <li><strong className="text-amber-400">{t("Locul 3:")}</strong>  {t("Shot-uri. Opțiunea non-alcoolică: Shot-uri fără alcool sau pahare de suc.")}</li>
                    <li><strong className="text-amber-400">{t("Locul 2:")}</strong>  {t("O găleată de beri. Opțiunea non-alcoolică: Beri fără alcool.")}</li>
                    <li><strong className="text-amber-400">{t("Locul 1:")}</strong>  {t("O sticlă de vin. Opțiunea non-alcoolică: Limonade.")} <em>{t("Atenție!")}</em>  {t("Dacă unii membri optează pentru limonadă, restul membrilor (care preferă varianta cu alcool) vor primi câte un pahar de vin în loc de sticla întreagă.")}</li>
                    <li><strong className="text-purple-100">{t("Detalii Premii:")}</strong>  {t("Echipele mai bine clasate au libertatea de a revendica premiile non-alcoolice specifice locurilor inferioare (ex: Locul 1 poate lua sucul de la Locul 3). Echipele pot oricând să schimbe premiile între ele de comun acord!")}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-heading text-red-400 tracking-wide flex items-center gap-3">
                    <Zap className="text-red-500 w-6 h-6" />
                     {t("4. Fără Telefoane!")} </h3>
                  <p className="mt-3 text-purple-200/80 text-sm sm:text-base">
                     {t("Ne place fair-play-ul. Utilizarea telefoanelor, ceasurilor smart, Shazam-ului sau a oricărui dispozitiv de inspirație externă în timpul rundelor este")} <strong>{t("strict interzisă")}</strong>{t(". Regulamentul funcționează astfel:")} </p>
                  <ul className="mt-4 space-y-3 text-purple-200/80 text-sm sm:text-base list-disc list-inside">
                    <li><strong className="text-purple-100">{t("Prima abatere:")}</strong>  {t("Echipa primește un avertisment clar.")}</li>
                    <li><strong className="text-purple-100">{t("A doua abatere:")}</strong>  {t("Echipa este penalizată cu pierderea")} <span className="text-red-400 font-bold">{t("tuturor punctelor")}</span>  {t("din runda curentă.")}</li>
                    <li><strong className="text-purple-100">{t("A treia abatere:")}</strong>  {t("Pierderea")} <span className="text-red-400 font-bold">{t("tuturor punctelor adunate în acel quiz")}</span>  {t("(descalificare de facto).")}</li>
                    <li><strong className="text-red-300">{t("Cheating la Pariu:")}</strong>  {t("Dacă sunteți prinși trișând la Pariu, pierdeți toate punctele din acea ediție. Deși veți avea 0 puncte și ați fi teoretic pe ultimul loc, NU veți primi dreptul de a alege tema pentru ediția viitoare; în schimb, penultima echipă o va alege!")}</li>
                  </ul>
                </div>

              </div>
            </div>
          </TabsContent>

          {/* TAB 3: THEME VALIDATOR TOOL */}
          <TabsContent value="validator">
            <ThemeValidator />
          </TabsContent>

        </Tabs>

      </div>
    </section>
  );
}
