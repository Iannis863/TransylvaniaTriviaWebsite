import { Resend } from 'resend';

// Initialize the client using the Vercel Environment Variable if present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// The "Intelligence" Check: Determine the 'From' email
const FROM_EMAIL = 'Transylvania Trivia <contact@transylvaniatrivia.com>';

export async function sendReminderEmail(
  toEmail: string,
  teamName: string,
  captainName: string,
  memberCount: number
) {
  try {
    if (!resend) {
      console.log(`[Email Mock] Reminder would be sent to ${toEmail} for team "${teamName}"`);
      return { success: true, data: { mock: true } };
    }
    const totalFee = memberCount * 10;
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Reminder: Transylvania Trivia is TONIGHT!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; padding: 40px; border-radius: 8px;">
          <h1 style="color: #a855f7; text-align: center; font-size: 28px; margin-bottom: 30px;">See You Tonight!</h1>
          <p>Hello <strong>${captainName}</strong>, your team <strong>${teamName}</strong> is ready for trivia glory!</p>
          <p><strong>Fee:</strong> ${totalFee} LEI at Insomnia Cafe & Bistro (20:00).</p>
        </div>
      `
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    return { success: false, error };
  }
}

export async function sendRegistrationConfirmation(
  toEmail: string,
  teamName: string,
  captainName: string,
  memberCount: number
) {
  try {
    if (!resend) {
      console.log(`[Email Mock] Registration confirmation would be sent to ${toEmail} for team "${teamName}"`);
      return { success: true, data: { mock: true } };
    }
    const totalFee = memberCount * 10;
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Welcome to Transylvania Trivia, ${teamName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; padding: 40px; border-radius: 8px;">
          <h1 style="color: #a855f7; text-align: center; font-size: 28px; margin-bottom: 30px;">Registration Confirmed!</h1>
          <p>Hello <strong>${captainName}</strong>, thank you for registering <strong>${teamName}</strong>.</p>
          <div style="background-color: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0;">
             <p><strong>Team Size:</strong> ${memberCount} members</p>
             <p><strong>Entry Fee:</strong> ${totalFee} LEI</p>
          </div>
          <p style="text-align: center;">See you at Insomnia Cafe & Bistro next Tuesday at 20:00!</p>
        </div>
      `
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send registration email:', error);
    return { success: false, error };
  }
}
