import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

type Mail = { to: string; subject: string; text: string; html: string };

export function mailConfigured(): void {
  const transport = process.env.MAIL_TRANSPORT || 'resend';
  if (transport === 'file' && process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    if (!process.env.PRIVATE_MAIL_DIR || !isAbsolute(process.env.PRIVATE_MAIL_DIR)) throw new Error('PRIVATE_MAIL_DIR must be an absolute private directory');
    const directory = resolve(process.env.PRIVATE_MAIL_DIR);
    for (const publicDirectory of ['public', 'dist', '.vercel/output']) {
      const remainder = relative(resolve(publicDirectory), directory);
      if (remainder === '' || (!remainder.startsWith(`..${sep}`) && remainder !== '..' && !isAbsolute(remainder))) {
        throw new Error('Test mail cannot be stored in a published output directory');
      }
    }
    return;
  }
  if (transport !== 'resend' || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('Production mail provider is not configured');
}

export async function sendMail(mail: Mail): Promise<void> {
  mailConfigured();
  if (process.env.MAIL_TRANSPORT === 'file' && process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const directory = process.env.PRIVATE_MAIL_DIR!;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(`${directory}/${Date.now()}-${randomUUID()}.json`, JSON.stringify(mail, null, 2), { flag: 'wx', mode: 0o600 });
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!response.ok) throw new Error('Email provider rejected the message');
  await response.body?.cancel();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function accountMail(to: string, link: string, kind: 'verify' | 'reset'): Mail {
  const verify = kind === 'verify';
  const heading = verify ? 'Завершите регистрацию на avalur.me' : 'Новый пароль для avalur.me';
  const action = verify ? 'Подтвердить email и выбрать пароль' : 'Выбрать новый пароль';
  const explanation = verify ? 'Ссылка действует 60 минут.' : 'Ссылка действует 30 минут. После смены пароля прежние сессии завершатся.';
  return {
    to, subject: heading,
    text: `${heading}\n\n${action}:\n${link}\n\n${explanation}\n\nЕсли вы не запрашивали письмо, просто проигнорируйте его.`,
    html: `<p>${heading}</p><p><a href="${escapeHtml(link)}">${action}</a></p><p>${explanation}</p><p>Если вы не запрашивали письмо, просто проигнорируйте его.</p>`,
  };
}
