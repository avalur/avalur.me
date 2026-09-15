import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { cleanEmail } from '../src/lib/auth/config';
import { getDb } from '../src/lib/auth/db';

const { values } = parseArgs({ options: {
  grant: { type: 'string' }, revoke: { type: 'string' }, 'grant-file': { type: 'string' }, 'dry-run': { type: 'boolean', default: false },
}, strict: true });

async function main() {
  if ([values.grant, values.revoke, values['grant-file']].filter(Boolean).length !== 1) throw new Error('Choose exactly one of --grant EMAIL, --revoke EMAIL or --grant-file PRIVATE_PATH');
  const raw = values['grant-file'] ? (await readFile(values['grant-file'], 'utf8')).split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')) : [values.grant || values.revoke!];
  const emails = [...new Set(raw.map(email => {
    const normalized = cleanEmail(email);
    if (!normalized) throw new Error('The input contains an invalid email');
    return normalized;
  }))];
  if (!emails.length) throw new Error('No addresses in input');
  if (values['dry-run']) { console.log(`Validated ${emails.length} address(es). No changes made.`); return; }
  const revokedAt = values.revoke ? new Date() : null;
  const db = getDb();
  await db.$transaction(emails.map(emailNormalized => db.accessGrant.upsert({
    where: { scope_emailNormalized: { scope: 'trips', emailNormalized } },
    create: { scope: 'trips', emailNormalized, revokedAt }, update: { revokedAt },
  })));
  console.log(`${values.revoke ? 'Revoked' : 'Granted'} trip access for ${emails.length} address(es).`);
  await db.$disconnect();
}

main().catch(() => { console.error('Access update failed. Check arguments and database configuration.'); process.exitCode = 1; });
