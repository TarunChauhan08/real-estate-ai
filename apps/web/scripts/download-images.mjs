/* eslint-disable no-console */
/**
 * Downloads every marketing photo into public/images so the site can run without
 * reaching Unsplash (on-prem installs, offline demos). Then set NEXT_PUBLIC_SELF_HOSTED_IMAGES=true.
 *
 *   pnpm --filter @rea/web images:download
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = await readFile(path.join(root, 'src/lib/images.ts'), 'utf8');
const entries = [...source.matchAll(/^\s{2}(\w+): \{\s*\n\s*id: '([\w-]+)'/gm)].map((m) => ({
  key: m[1],
  id: m[2],
}));
const outDir = path.join(root, 'public/images');
await mkdir(outDir, { recursive: true });

for (const { key, id } of entries) {
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=3840&q=80&fm=jpg`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(
      `✗ ${key} (${id}): HTTP ${res.status} — pick another photo ID in src/lib/images.ts`,
    );
    continue;
  }
  await writeFile(path.join(outDir, `${key}.jpg`), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${key}`);
}
