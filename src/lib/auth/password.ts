import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

export function passwordProblem(value: unknown, email?: string): string | null {
  if (typeof value !== 'string' || value.length < 10) return 'Используйте не менее 10 символов в пароле.';
  if (value.length > 200) return 'Пароль должен быть не длиннее 200 символов.';
  if (!value.trim()) return 'Пароль не может состоять из пробелов.';
  if (email && value.toLowerCase() === email.toLowerCase()) return 'Пароль не должен совпадать с email.';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password.normalize('NFKC'), salt, KEY_LENGTH, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

function parse(stored: string | null) {
  const parts = stored?.split('$');
  if (!parts || parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [, n, r, p, salt64, hash64] = parts;
  if (+n !== PARAMS.N || +r !== PARAMS.r || +p !== PARAMS.p) return null;
  const salt = Buffer.from(salt64, 'base64');
  const hash = Buffer.from(hash64, 'base64');
  return salt.length === 16 && hash.length === KEY_LENGTH ? { salt, hash } : null;
}

const dummy = { salt: randomBytes(16), hash: randomBytes(KEY_LENGTH) };

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parsed = parse(stored);
  const { salt, hash } = parsed || dummy;
  const candidate = await derive(password.normalize('NFKC'), salt, KEY_LENGTH, PARAMS);
  return timingSafeEqual(candidate, hash) && parsed !== null;
}
