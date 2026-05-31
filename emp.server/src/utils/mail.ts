import nodemailer from 'nodemailer';

interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendMail = async (input: SendMailInput): Promise<void> => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL ?? 'noreply@localhost';

  if (!host || !user || !pass) {
    console.info('[email] SMTP not configured; skipping send. Subject:', input.subject);
    console.info('[email] Preview (text):\n', input.text);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
};
