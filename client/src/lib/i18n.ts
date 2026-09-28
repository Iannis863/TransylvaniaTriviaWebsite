import { useSyncExternalStore } from "react";
import englishNotes from "./locales/notes-en.json";
import english from "./locales/en.json";
export type Language = "ro" | "en";
let language: Language = "ro";
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const locale = () => language === "ro" ? "ro-RO" : "en-GB";
export function setLanguage(next: Language) {
  if (next === language) return;
  language = next;
  document.documentElement.lang = next;
  document.title = next === "ro" ? "Transilvania Trivia — Quiz săptămânal la Insomnia" : "Transilvania Trivia — Weekly quiz at Insomnia";
  listeners.forEach(notify => notify());
}
export function useLanguage() {
  return useSyncExternalStore(callback => { listeners.add(callback); return () => listeners.delete(callback); }, getLanguage, () => "ro" as Language);
}
/** Translate authored copy only. User names, team names and submitted content stay untouched. */
export function t(key: string, values: readonly unknown[] = []): string {
  const copy = language === "en" ? (english as Record<string, string>)[key] ?? key : key;
  return copy.replace(/\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index]) : match);
}

// The scoring API emits a sequence of authored sentences with data placeholders.
// Translate those sentences without modifying a user's suggested theme.
const notePatterns = Object.entries(englishNotes).map(([key, value]) => ({
  expression: new RegExp("^" + key.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)")), value,
}));
export function translateFeedback(notes: string): string {
  if (language === "ro") return notes;
  let remaining = notes, output = "";
  while (remaining) {
    const pattern = notePatterns.find(item => item.expression.test(remaining));
    if (!pattern) return output + remaining;
    const match = remaining.match(pattern.expression)!;
    output += pattern.value.replace(/\{(\d+)\}/g, (_, index) => t(match[Number(index) + 1])) + " ";
    remaining = remaining.slice(match[0].length).trimStart();
  }
  return output.trimEnd();
}
