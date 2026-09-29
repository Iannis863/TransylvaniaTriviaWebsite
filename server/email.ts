import { createHash } from "node:crypto";
import { formatEventDate } from "../shared/event-time.js";
import { EMAIL_WEBSITE_URL } from "../shared/email-brand.js";
import { brandedEmail, escapeHtml, eventDetailRow } from "./email-layout.js";
export { escapeHtml } from "./email-layout.js";

export interface EmailPayload { to: string; subject: string; html: string; text: string; }
export interface EmailResult { success: boolean; skipped?: boolean; error?: string; }
export interface EventEmailDetails {
  email: string;
  name: string;
  teamName: string;
  memberCount: number;
  eventDate: Date;
  isCaptain: boolean;
  language?: "ro" | "en";
}
export type EmailKind = "confirmation" | "reminder" | "waitlist";
export const FROM_EMAIL = "Transilvania Trivia <contact@transilvaniatrivia.ro>";

export function buildEventEmail(kind: EmailKind, details: EventEmailDetails): EmailPayload {
  const { email, name, teamName, memberCount, eventDate, isCaptain, language = "ro" } = details;
  const ro = language === "ro";
  const l = (romanian: string, english: string) => ro ? romanian : english;
  const englishTitle = kind === "waitlist" ? "You're on the waiting list" : kind === "reminder" ? "See You Tonight!" : "Registration Confirmed!";
  const englishMessage = kind === "reminder"
    ? `your team ${teamName} is registered for tonight's trivia.`
    : kind === "waitlist"
      ? `${isCaptain ? `you added your team ${teamName}` : `your captain added your team ${teamName}`} to the waiting list. Your place is not confirmed. If the quizmaster accepts your team, we'll send a separate confirmation email. Please wait for that confirmation before attending.`
      : isCaptain ? `you registered your team ${teamName}. Your team's place is now confirmed.` : `your team ${teamName} was registered by your captain. Your team's place is now confirmed.`;
  const title = ro ? kind === "waitlist" ? "Echipa ta este pe lista de așteptare" : kind === "reminder" ? "Ne vedem diseară!" : "Înscriere confirmată!" : englishTitle;
  const message = ro ? kind === "reminder"
    ? `echipa ta, ${teamName}, este înscrisă la quizul din această seară.`
    : kind === "waitlist"
      ? `${isCaptain ? `ai înscris echipa ${teamName}` : `căpitanul a înscris echipa ta, ${teamName},`} pe lista de așteptare. Locul nu este încă rezervat. Dacă quizmasterul acceptă echipa, veți primi un email de confirmare. Așteptați confirmarea înainte de a veni la eveniment.`
      : isCaptain ? `ai înscris echipa ${teamName}. Locul echipei este confirmat.` : `echipa ta, ${teamName}, a fost înscrisă de căpitan. Locul echipei este confirmat.`
    : englishMessage;
  const dateLabel = `${formatEventDate(eventDate, language)} (${l("ora României", "Romania time")})`;
  const fee = memberCount * 10;
  return {
    to: email,
    subject: kind === "reminder" ? l("Ne vedem DISEARĂ la Transilvania Trivia!", "Reminder: Transylvania Trivia is TONIGHT!") : `${kind === "waitlist" ? l("Listă de așteptare", "Waiting list") : l("Înscriere confirmată", "Registration confirmed")}: ${teamName.replace(/[\r\n]/g, " ")}`,
    text: `${l("Bună", "Hello")} ${name}, ${message}\n${dateLabel}\nInsomnia Cafe & Bistro\n${l("Membri", "Team size")}: ${memberCount}\n${l("Taxă de participare", "Entry fee")}: 10 LEI ${l("de persoană", "per person")} (${fee} LEI ${l("pentru întreaga echipă", "for the whole team")}).`,
    html: brandedEmail({
      title, language,
      label: kind === "waitlist" ? l("ÎN AȘTEPTAREA UNUI LOC", "WAITING FOR A PLACE") : kind === "reminder" ? l("DISEARĂ LA INSOMNIA", "TONIGHT AT INSOMNIA") : l("LOCUL VOSTRU ESTE CONFIRMAT", "YOUR PLACE IS CONFIRMED"),
      preheader: kind === "waitlist" ? l(`${teamName} este pe lista de așteptare. Așteptați confirmarea.`, `${teamName} is on the waiting list. Please wait for confirmation.`) : `${teamName} · ${dateLabel} · Insomnia Cafe & Bistro`,
      body: `<p style="margin:12px 0 24px;">${l("Bună", "Hello")} <strong style="color:#f5c767;">${escapeHtml(name)}</strong>, ${escapeHtml(message)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1c0d2d" style="width:100%;background-color:#1c0d2d;border:1px solid #55316c;border-radius:10px;">
          ${eventDetailRow(l("ECHIPA TA", "YOUR TEAM"), `${teamName} · ${memberCount} ${l("jucători", "players")}`)}
          ${eventDetailRow(l("CÂND", "WHEN"), dateLabel)}
          ${eventDetailRow(l("UNDE", "WHERE"), "Insomnia Cafe & Bistro")}
          ${eventDetailRow(kind === "waitlist" ? l("TAXĂ DACĂ SUNTEȚI ACCEPTAȚI", "ENTRY FEE IF ACCEPTED") : l("TAXĂ DE PARTICIPARE", "ENTRY FEE"), `10 LEI ${l("de persoană", "per person")} · ${fee} LEI ${l("pentru întreaga echipă", "for the whole team")}`)}
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td bgcolor="#f5c767" style="background-color:#f5c767;border:1px solid #f5c767;border-radius:6px;mso-padding-alt:14px 20px;">
          <a href="${EMAIL_WEBSITE_URL}" style="display:inline-block;padding:14px 20px;font-size:14px;line-height:20px;font-weight:bold;color:#180b24;text-decoration:none;">${l("Vezi detaliile evenimentului", "View event details")} &rarr;</a>
        </td></tr></table>`,
      footer: kind === "waitlist" ? l("Acest email confirmă înscrierea pe lista de așteptare. Masa nu este încă rezervată. Vă anunțăm pe email dacă echipa este acceptată.", "This email confirms your waiting-list entry, not a reserved table. We will email you if your team is accepted.") : l("Voi aduceți curiozitatea, noi aducem întrebările. Ne vedem la Insomnia Cafe & Bistro!", "Bring your curiosity. We'll bring the questions. See you at Insomnia Cafe & Bistro!"),
    }),
  };
}

// The installed Resend SDK predates idempotency support; use the documented HTTP header.
export async function sendEmail(payload: EmailPayload, deliveryId?: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY is missing; delivery remains pending.");
    return { success: false, skipped: true };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
        ...(deliveryId ? { "Idempotency-Key": createHash("sha256").update(deliveryId).digest("hex") } : {}),
      },
      body: JSON.stringify({ from: FROM_EMAIL, ...payload }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error(`[Email] Provider rejected delivery (${response.status})`);
      return { success: false, error: `Resend HTTP ${response.status}` };
    }
    return { success: true };
  } catch {
    console.error("[Email] Delivery request failed");
    return { success: false };
  }
}
export function buildPasswordResetEmail(toEmail: string, code: string, language: "ro" | "en" = "ro"): EmailPayload {
  const l = (ro: string, en: string) => language === "ro" ? ro : en;
  return {
    to: toEmail,
    subject: l("Codul tău de resetare parolă — Transylvania Trivia", "Your password reset code \u2014 Transylvania Trivia"),
    text: l(`Codul tău de resetare: ${code}. Expiră în 10 minute. Dacă nu ai solicitat resetarea, ignoră acest email.`, `Your reset code: ${code}. It expires in 10 minutes. If you did not request a reset, ignore this email.`),
    html: brandedEmail({
      language, title: l("Resetare parolă", "Reset your password"), label: l("ACCES LA CONTUL TĂU", "ACCESS YOUR ACCOUNT"),
      preheader: l("Codul tău de resetare Transilvania Trivia este valabil 10 minute.", "Your Transilvania Trivia reset code is valid for 10 minutes."),
      body: `<p style="margin:12px 0 24px;">${l("Ai solicitat o parolă nouă pentru contul tău. Introdu codul de mai jos în formularul de resetare:", "You requested a new password for your account. Enter this code in the reset form:")}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1c0d2d" style="width:100%;background-color:#1c0d2d;border:1px solid #80539b;border-radius:10px;">
          <tr><td align="center" style="padding:24px 12px;">
            <p style="margin:0 0 12px;font-size:11px;line-height:18px;letter-spacing:2px;color:#d8adf4;">${l("CODUL TĂU DE RESETARE", "YOUR RESET CODE")}</p>
            <p style="margin:0;font-family:'Courier New',monospace;font-size:34px;line-height:44px;font-weight:bold;letter-spacing:5px;color:#f5c767;">${escapeHtml(code)}</p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;color:#c4afda;">${l("Codul expiră în", "The code expires in")} <strong style="color:#f5eefb;">${l("10 minute", "10 minutes")}</strong>. ${l("Nu îl trimite altor persoane.", "Do not share it with anyone.")}</p>`,
      footer: l("Dacă nu ai solicitat resetarea parolei, ignoră acest email. Parola ta rămâne neschimbată.", "If you did not request a password reset, ignore this email. Your password remains unchanged."),
    }),
  };
}
export async function sendPasswordResetCode(toEmail: string, code: string, language: "ro" | "en" = "ro"): Promise<EmailResult> {
  return sendEmail(buildPasswordResetEmail(toEmail, code, language));
}
