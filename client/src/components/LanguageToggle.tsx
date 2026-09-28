import { setLanguage, useLanguage } from "@/lib/i18n";
export default function LanguageToggle() {
  const language = useLanguage();
  return <div role="group" aria-label={language === "ro" ? "Limba site-ului" : "Website language"} className="fixed bottom-4 left-4 z-[100] flex gap-1 rounded-full border border-amber-400/50 bg-[#160b25] p-1 shadow-lg">
    {(["ro", "en"] as const).map(value => <button key={value} type="button" lang={value} aria-label={value === "ro" ? "Română" : "English"} aria-pressed={language === value} onClick={() => setLanguage(value)} className={`min-h-10 min-w-12 rounded-full px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${language === value ? "bg-amber-300 text-purple-950" : "text-purple-100 hover:bg-purple-800"}`}>{value.toUpperCase()}</button>)}
  </div>;
}
