import { EMAIL_LOGO_URL, EMAIL_WEBSITE_URL } from "../shared/email-brand.js";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

type EmailTextColor = "#f5eefb" | "#ffc30b" | "#d8adf4" | "#c4afda" | "#180b24";

// The original inline colours remain the fallback outside Gmail on iOS.
export function emailText(value: string, color: EmailTextColor = "#f5eefb"): string {
  return `<span class="email-text-${color.slice(1)}">${escapeHtml(value)}</span>`;
}

// Gmail iOS preserves gradients when it rewrites solid colours in dark mode.
// Protect both text and backgrounds to retain contrast and each original colour.
// Source: https://emailmatrix.ru/blog/gmail-ios-dark-mode/
// Gmail Android/web have an extra div parent: restore their normal rendering.
const gmailColorStyles = `<style>
@media only screen and (max-width:480px) {
${["#09040e", "#12081f", "#ffc30b", "#08040d", "#0d0616", "#1c0d2d"].map(color => `
  u + .trivia-email-body .email-bg-${color.slice(1)} { background-image:linear-gradient(${color},${color}); }
  div > u + .trivia-email-body .email-bg-${color.slice(1)} { background-image:none; }`).join("")}
${["#f5eefb", "#ffc30b", "#d8adf4", "#c4afda", "#180b24"].map(color => `
  u + .trivia-email-body .email-text-${color.slice(1)} { background-image:linear-gradient(${color},${color}); background-clip:text; color:transparent; }
  div > u + .trivia-email-body .email-text-${color.slice(1)} { background-image:none; background-clip:border-box; color:${color}; }`).join("")}
}
</style>`;

// Presentation tables, inline styles, and explicit colours keep the core layout
// usable in email clients without CSS grid, external fonts, or background images.
export function brandedEmail({ title, label, preheader, body, footer, language = "en" }: {
  title: string; label: string; preheader: string; body: string; footer: string; language?: "en" | "ro";
}): string {
  return `<!DOCTYPE html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${gmailColorStyles}</head>
<body class="trivia-email-body" style="margin:0;padding:0;">
<div class="email-bg-09040e" lang="${language}" style="margin:0;padding:0;background-color:#09040e;color:#f5eefb;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;color:#09040e;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table class="email-bg-09040e" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#09040e" style="width:100%;background-color:#09040e;">
    <tr><td align="center" style="padding:24px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table class="email-bg-12081f" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#12081f" style="width:100%;max-width:600px;background-color:#12081f;border:1px solid #44215c;border-radius:16px;overflow:hidden;">
        <tr><td class="email-bg-ffc30b" height="4" bgcolor="#ffc30b" style="height:4px;font-size:0;line-height:0;background-color:#ffc30b;">&nbsp;</td></tr>
        <tr><td class="email-bg-08040d" align="center" bgcolor="#08040d" style="padding:24px 24px 20px;background-color:#08040d;border-bottom:1px solid #44215c;">
          <a href="${EMAIL_WEBSITE_URL}" style="text-decoration:none;"><img src="${EMAIL_LOGO_URL}" width="184" height="184" alt="Transilvania Trivia" border="0" style="display:block;width:184px;max-width:100%;height:auto;border:0;outline:none;color:#ffc30b;font-size:18px;" /></a>
        </td></tr>
        <tr><td style="padding:28px 24px 12px;">
          <p style="margin:0 0 12px;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:2px;color:#d8adf4;">${emailText(label, "#d8adf4")}</p>
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;font-weight:bold;color:#ffc30b;">${emailText(title, "#ffc30b")}</h1>
        </td></tr>
        <tr><td style="padding:4px 24px 28px;font-size:16px;line-height:26px;color:#f5eefb;overflow-wrap:anywhere;">${body}</td></tr>
        <tr><td class="email-bg-0d0616" style="padding:20px 24px;border-top:1px solid #44215c;background-color:#0d0616;">
          <p style="margin:0 0 8px;font-size:12px;line-height:20px;font-weight:bold;letter-spacing:1px;color:#ffc30b;">${emailText("TRANSILVANIA TRIVIA", "#ffc30b")}</p>
          <p style="margin:0;font-size:12px;line-height:20px;color:#c4afda;">${emailText(footer, "#c4afda")}</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</div></body></html>`;
}

export function eventDetailRow(label: string, value: string): string {
  return `<tr><td style="padding:14px 18px;border-bottom:1px solid #38204e;">
    <p style="margin:0 0 4px;font-size:11px;line-height:16px;font-weight:bold;letter-spacing:1px;color:#c4afda;">${emailText(label, "#c4afda")}</p>
    <p style="margin:0;font-size:15px;line-height:23px;color:#f5eefb;">${emailText(value)}</p>
  </td></tr>`;
}
